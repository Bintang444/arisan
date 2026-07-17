'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { initMingguArisan, getTanggalMulai } from '@/lib/arisan-helpers'
import { addDays, parseISO, format } from 'date-fns'
import { id } from 'date-fns/locale'
import ExcelJS from 'exceljs'
import {
  Search,
  Trophy,
  Loader2,
  AlertCircle,
  LogOut,
  Users,
  Settings,
  Download,
} from 'lucide-react'

type PesertaWithSetoran = {
  id: number
  nama_peserta: string
  nama_asli: string | null
  nominal_mingguan: number
  minggu_menang: number | null
  statusMingguIni: 'LUNAS' | 'BELUM_BAYAR'
  statusMingguLalu: 'LUNAS' | 'BELUM_BAYAR' | null
  setoranMingguIniId: number | null
  setoranMingguLaluId: number | null
}

export default function AdminPage() {
  const router = useRouter()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [mingguAktif, setMingguAktif] = useState(1)
  const [totalMinggu, setTotalMinggu] = useState(0)
  const [siklusSelesai, setSiklusSelesai] = useState(false)
  const [tanggalMulai, setTanggalMulai] = useState<string | null>(null)

  const [data, setData] = useState<PesertaWithSetoran[]>([])
  const [search, setSearch] = useState('')
  const [hanyaBelumBayar, setHanyaBelumBayar] = useState(false)
  const [hanyaBelumBayarLalu, setHanyaBelumBayarLalu] = useState(false)

  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const fetchData = useCallback(async (minggu: number) => {
    setLoading(true)
    setErrorMsg(null)

    const { data: peserta, error: pesertaError } = await supabase
      .from('peserta_arisan')
      .select('id, nama_peserta, nama_asli, nominal_mingguan, minggu_menang')
      .order('nama_peserta', { ascending: true })

    if (pesertaError || !peserta) {
      setErrorMsg(pesertaError?.message ?? 'Gagal memuat data peserta.')
      setLoading(false)
      return
    }

    const mingguLalu = minggu - 1
    const { data: setoran, error: setoranError } = await supabase
      .from('setoran_mingguan')
      .select('id, peserta_id, minggu_ke, status')
      .in('minggu_ke', mingguLalu > 0 ? [minggu, mingguLalu] : [minggu])

    if (setoranError) {
      setErrorMsg(setoranError.message)
      setLoading(false)
      return
    }

    const combined: PesertaWithSetoran[] = peserta.map((p) => {
      const setoranIni = setoran?.find(
        (s) => s.peserta_id === p.id && s.minggu_ke === minggu
      )
      const setoranLalu = setoran?.find(
        (s) => s.peserta_id === p.id && s.minggu_ke === mingguLalu
      )

      return {
        ...p,
        statusMingguIni: (setoranIni?.status as 'LUNAS' | 'BELUM_BAYAR') ?? 'BELUM_BAYAR',
        statusMingguLalu: (setoranLalu?.status as 'LUNAS' | 'BELUM_BAYAR') ?? null,
        setoranMingguIniId: setoranIni?.id ?? null,
        setoranMingguLaluId: setoranLalu?.id ?? null,
      }
    })

    setData(combined)
    setLoading(false)
  }, [])

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      setCheckingAuth(false)

      const result = await initMingguArisan()

      if (result.error) {
        setErrorMsg(result.error)
        setLoading(false)
        return
      }

      setMingguAktif(result.mingguAktif)
      setTotalMinggu(result.totalMinggu)
      setSiklusSelesai(result.siklusSelesai)

      const tgl = await getTanggalMulai()
      if (tgl) setTanggalMulai(tgl)

      if (!result.siklusSelesai) {
        await fetchData(result.mingguAktif)
      } else {
        setLoading(false)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleTandaiLunas = async (peserta: PesertaWithSetoran) => {
    setUpdatingId(peserta.id)

    if (peserta.statusMingguIni === 'LUNAS') {
      await supabase
        .from('setoran_mingguan')
        .update({
          status: 'BELUM_BAYAR',
          jumlah_bayar: null,
          tanggal_bayar: null,
        })
        .eq('id', peserta.setoranMingguIniId)

      setData((prev) =>
        prev.map((p) =>
          p.id === peserta.id
            ? { ...p, statusMingguIni: 'BELUM_BAYAR' }
            : p
        )
      )
    } else {
      let setoranId = peserta.setoranMingguIniId

      if (setoranId) {
        await supabase
          .from('setoran_mingguan')
          .update({
            status: 'LUNAS',
            jumlah_bayar: peserta.nominal_mingguan,
            tanggal_bayar: new Date().toISOString().slice(0, 10),
          })
          .eq('id', setoranId)
      } else {
        const { data } = await supabase.from('setoran_mingguan').insert({
          peserta_id: peserta.id,
          minggu_ke: mingguAktif,
          status: 'LUNAS',
          jumlah_bayar: peserta.nominal_mingguan,
          tanggal_bayar: new Date().toISOString().slice(0, 10),
        }).select('id').single()

        if (data) setoranId = data.id
      }

      setData((prev) =>
        prev.map((p) =>
          p.id === peserta.id
            ? { ...p, statusMingguIni: 'LUNAS', setoranMingguIniId: setoranId }
            : p
        )
      )
    }

    setUpdatingId(null)
  }

  const handleTandaiLunasMingguLalu = async (peserta: PesertaWithSetoran) => {
    if (!peserta.setoranMingguLaluId) return

    setUpdatingId(peserta.id)

    if (peserta.statusMingguLalu === 'LUNAS') {
      await supabase
        .from('setoran_mingguan')
        .update({
          status: 'BELUM_BAYAR',
          jumlah_bayar: null,
          tanggal_bayar: null,
        })
        .eq('id', peserta.setoranMingguLaluId)

      setData((prev) =>
        prev.map((p) =>
          p.id === peserta.id
            ? { ...p, statusMingguLalu: 'BELUM_BAYAR' }
            : p
        )
      )
    } else {
      await supabase
        .from('setoran_mingguan')
        .update({
          status: 'LUNAS',
          jumlah_bayar: peserta.nominal_mingguan,
          tanggal_bayar: new Date().toISOString().slice(0, 10),
        })
        .eq('id', peserta.setoranMingguLaluId)

      setData((prev) =>
        prev.map((p) =>
          p.id === peserta.id
            ? { ...p, statusMingguLalu: 'LUNAS' }
            : p
        )
      )
    }

    setUpdatingId(null)
  }


  const handleExport = async () => {
    setIsExporting(true)
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet(`Minggu ${mingguAktif}`)

      // 1. Lebar kolom (sebelum data)
      worksheet.columns = [
        { width: 22 },
        { width: 22 },
        { width: 18 },
        { width: 16 },
        { width: 22 },
      ]

      // 2. Judul (Baris 1)
      worksheet.mergeCells('A1:E1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = 'ARISAN MINGGUAN IBU-IBU'
      titleCell.font = { name: 'Arial', size: 14, bold: true }
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getRow(1).height = 25

      // 3. Subjudul (Baris 2)
      worksheet.mergeCells('A2:E2')
      const subCell = worksheet.getCell('A2')
      subCell.value = `Minggu ke-${mingguAktif} dari ${totalMinggu}`
      subCell.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } }
      subCell.alignment = { horizontal: 'center', vertical: 'middle' }
      worksheet.getRow(2).height = 20

      // 4. Header Tabel (Baris 4)
      const headerRow = worksheet.getRow(4)
      headerRow.values = ['Nama Peserta', 'Nama Asli', 'Nominal/Minggu', 'Minggu Menang', 'Tanggal Kocokan']
      headerRow.height = 24

      const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D9488' } } as const
      headerRow.eachCell((cell) => {
        cell.fill = headerFill
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF334155' } },
          left: { style: 'thin', color: { argb: 'FF334155' } },
          bottom: { style: 'thin', color: { argb: 'FF334155' } },
          right: { style: 'thin', color: { argb: 'FF334155' } },
        }
      })

      // 5. Data (Baris 5+)
      data.forEach((p) => {
        const tglKocokan = tanggalMulai && p.minggu_menang
          ? format(addDays(parseISO(tanggalMulai), p.minggu_menang * 7 - 1), 'd MMMM yyyy', { locale: id })
          : '-'

        const row = worksheet.addRow([
          p.nama_peserta,
          p.nama_asli ?? '-',
          `Rp${p.nominal_mingguan.toLocaleString('id-ID')}`,
          p.minggu_menang ?? '-',
          tglKocokan,
        ])
        row.height = 20

        row.eachCell((cell) => {
          cell.font = { name: 'Arial', size: 10 }
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          }
        })
      })

      // 6. Download
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Arisanku_Minggu_${mingguAktif}.xlsx`
      anchor.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const error = err as Error
      alert('Gagal mengekspor Excel: ' + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  const filteredData = data.filter((p) => {
    const matchSearch =
      search.trim() === '' ||
      p.nama_peserta.toLowerCase().includes(search.toLowerCase()) ||
      p.nama_asli?.toLowerCase().includes(search.toLowerCase())

    const matchFilterMingguIni = !hanyaBelumBayar || p.statusMingguIni === 'BELUM_BAYAR'
    const matchFilterMingguLalu = !hanyaBelumBayarLalu || p.statusMingguLalu === 'BELUM_BAYAR'

    return matchSearch && matchFilterMingguIni && matchFilterMingguLalu
  })

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 antialiased">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memeriksa sesi login...
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 antialiased selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-2xl">
        {/* Gradient Header */}
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Arisan Mingguan
              </h1>
              {!siklusSelesai && (
                <p className="mt-2 font-medium text-emerald-100">
                  Minggu ke-<span className="rounded-full bg-white px-2.5 py-0.5 text-sm font-bold text-emerald-800 shadow-sm">{mingguAktif}</span> dari {totalMinggu}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/peserta"
                className="rounded-xl bg-white/20 p-2.5 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/30"
                title="Kelola Peserta"
              >
                <Users className="h-4 w-4" />
              </Link>
              <Link
                href="/admin/pengaturan"
                className="rounded-xl bg-white/20 p-2.5 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/30"
                title="Pengaturan"
              >
                <Settings className="h-4 w-4" />
              </Link>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="rounded-xl bg-white/20 p-2.5 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/30 disabled:opacity-60"
                title="Export Excel"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-xl bg-white/20 p-2.5 text-white shadow-sm backdrop-blur transition-colors hover:bg-white/30"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-base font-medium text-rose-800 shadow-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {siklusSelesai ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-amber-200 bg-white p-10 text-center shadow-md">
            <div className="mb-4 rounded-full bg-amber-100 p-4">
              <Trophy className="h-14 w-14 animate-bounce text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Arisan Sudah Selesai 🎉
            </h2>
            <p className="mt-2 max-w-sm text-base leading-relaxed text-slate-600">
              Semua peserta sudah mendapat giliran menang. Atur ulang di halaman Peserta &amp; Pengaturan untuk mulai siklus baru.
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-base font-medium">Memuat data...</span>
          </div>
        ) : (
          <>
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nama peserta..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400 font-medium text-slate-900"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setHanyaBelumBayar((v) => !v)}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    hanyaBelumBayar
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'border-2 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {hanyaBelumBayar ? '✓ Minggu Ini' : 'Minggu Ini'}
                </button>
                <button
                  onClick={() => setHanyaBelumBayarLalu((v) => !v)}
                  className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                    hanyaBelumBayarLalu
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'border-2 border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50'
                  }`}
                >
                  {hanyaBelumBayarLalu ? '✓ Minggu Lalu' : 'Minggu Lalu'}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {filteredData.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-white py-12 text-center text-base font-medium text-slate-500 shadow-sm">
                  Tidak ada data yang cocok.
                </div>
              ) : (
                filteredData.map((p) => {
                  const isPemenangMingguIni = p.minggu_menang === mingguAktif
                  return (
                    <div
                      key={p.id}
                      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-slate-900">
                            {p.nama_peserta}
                          </p>
                          {p.nama_asli && (
                            <p className="truncate text-sm font-medium text-slate-400">
                              {p.nama_asli}
                            </p>
                          )}
                        </div>
                        {isPemenangMingguIni && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                            <Trophy className="h-3 w-3" />
                            Menang
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Minggu Ini
                          </p>
                          <button
                            onClick={() => handleTandaiLunas(p)}
                            disabled={updatingId === p.id}
                            className={`w-full rounded-xl px-3 py-3 text-sm font-bold transition-all ${
                              p.statusMingguIni === 'LUNAS'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-500 text-white shadow-sm hover:bg-rose-600'
                            } disabled:cursor-default disabled:opacity-70`}
                          >
                            {updatingId === p.id ? (
                              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                            ) : p.statusMingguIni === 'LUNAS' ? (
                              'LUNAS'
                            ) : (
                              'BELUM BAYAR'
                            )}
                          </button>
                        </div>

                        <div>
                          <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Minggu Lalu
                          </p>
                          {p.statusMingguLalu === null ? (
                            <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center text-sm font-semibold text-slate-400">
                              -
                            </div>
                          ) : p.statusMingguLalu === 'LUNAS' ? (
                              <button
                                onClick={() => handleTandaiLunasMingguLalu(p)}
                                disabled={updatingId === p.id}
                                className="w-full rounded-xl bg-emerald-100 px-3 py-3 text-sm font-bold text-emerald-800 transition-all hover:bg-emerald-200 disabled:cursor-default disabled:opacity-70"
                              >
                                {updatingId === p.id ? (
                                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                                ) : (
                                  'LUNAS'
                                )}
                              </button>
                          ) : (
                              <button
                                onClick={() => handleTandaiLunasMingguLalu(p)}
                                disabled={updatingId === p.id}
                                className="w-full rounded-xl bg-rose-500 px-2 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-rose-600 disabled:cursor-default disabled:opacity-70"
                              >
                                {updatingId === p.id ? (
                                  <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                                ) : (
                                  'BELUM BAYAR'
                                )}
                              </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
