'use client'

import { useEffect, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import { id } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { initMingguArisan, getTanggalMulai } from '@/lib/arisan-helpers'
import Link from 'next/link'
import {
  Search,
  Trophy,
  Loader2,
  AlertCircle,
  Calendar,
  Gift,
  CheckCircle2,
  LogIn
} from 'lucide-react'

type Peserta = {
  id: number
  nama_peserta: string
  nama_asli: string | null
  minggu_menang: number | null
}

export default function PublicPage() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [mingguAktif, setMingguAktif] = useState(1)
  const [totalMinggu, setTotalMinggu] = useState(0)
  const [siklusSelesai, setSiklusSelesai] = useState(false)
  const [tanggalMulai, setTanggalMulai] = useState<string | null>(null)

  const [peserta, setPeserta] = useState<Peserta[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    const init = async () => {
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
      setTanggalMulai(tgl)

      const { data, error } = await supabase
        .from('peserta_arisan')
        .select('id, nama_peserta, nama_asli, minggu_menang')
        .order('nama_peserta', { ascending: true })

      if (error) {
        setErrorMsg(error.message)
      } else if (data) {
        setPeserta(data)
      }

      setLoading(false)
    }

    init()
  }, [])

  const daftarMinggu = Array.from({ length: totalMinggu }, (_, i) => {
    const mingguKe = i + 1
    const pemenang = peserta.find((p) => p.minggu_menang === mingguKe)
    const tglKocokan = tanggalMulai
      ? format(addDays(parseISO(tanggalMulai), mingguKe * 7 - 1), 'd MMMM yyyy', { locale: id })
      : ''
    return { mingguKe, tglKocokan, pemenang: pemenang?.nama_peserta ?? null, namaAsli: pemenang?.nama_asli ?? null }
  })

  const sudahMenang = peserta.filter(
    (p) => p.minggu_menang !== null && p.minggu_menang <= mingguAktif
  ).length

  const filteredMinggu = search.trim()
    ? daftarMinggu.filter((m) =>
        m.pemenang?.toLowerCase().includes(search.toLowerCase()) ||
        m.namaAsli?.toLowerCase().includes(search.toLowerCase())
      )
    : daftarMinggu

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 antialiased selection:bg-emerald-500 selection:text-white">
      <div className="mx-auto max-w-2xl">

        {/* Header Utama - Font Tebal & Kontras Tinggi */}
        <div className="relative mb-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-md">
          <Link
            href="/login"
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl bg-white/20 px-3 py-2 text-xs font-bold backdrop-blur transition-colors hover:bg-white/30"
          >
            <LogIn className="h-3.5 w-3.5" />
            Login
          </Link>
          <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight">
            Arisan Mingguan
          </h1>
          {!siklusSelesai && (
            <p className="mt-2 text-base text-emerald-100 font-medium">
              Sekarang: <span className="bg-white text-emerald-800 px-2.5 py-0.5 rounded-full text-sm font-bold shadow-sm">Minggu ke-{mingguAktif}</span> dari {totalMinggu}
            </p>
          )}
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-base text-rose-800 shadow-sm">
            <AlertCircle className="h-6 w-6 shrink-0 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {siklusSelesai ? (
          <div className="flex flex-col items-center justify-center rounded-3xl bg-white p-10 text-center shadow-md border-2 border-amber-200">
            <div className="bg-amber-100 p-4 rounded-full mb-4">
              <Trophy className="h-14 w-14 text-amber-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Arisan Sudah Selesai 🎉
            </h2>
            <p className="mt-2 max-w-sm text-base text-slate-600 leading-relaxed">
              Semua peserta sudah mendapat giliran menang. Sampai jumpa di kocokan siklus berikutnya!
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-600 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-base font-medium">Sedang memuat data arisan...</span>
          </div>
        ) : (
          <>
            {/* Kartu Ringkasan - Angka Diperbesar */}
            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white p-5 text-center shadow-sm border border-slate-200/80">
                <p className="text-3xl font-black text-emerald-600">{peserta.length}</p>
                <p className="text-sm font-semibold text-slate-500 mt-1">Total Anggota</p>
              </div>
              <div className="rounded-2xl bg-white p-5 text-center shadow-sm border border-slate-200/80">
                <p className="text-3xl font-black text-slate-900">
                  {sudahMenang} <span className="text-lg text-slate-400 font-normal">/ {totalMinggu}</span>
                </p>
                <p className="text-sm font-semibold text-slate-500 mt-1">Sudah Dapat</p>
              </div>
            </div>

            {/* Input Pencarian - Lebih Besar & Border Lebih Jelas */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Ketik nama untuk mencari pemenang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border-2 border-slate-300 bg-white py-3.5 pl-12 pr-4 text-base shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400 font-medium text-slate-900"
              />
            </div>

            {/* Daftar Mingguan / Timeline */}
            <div className="space-y-3">
              {filteredMinggu.length === 0 ? (
                <div className="rounded-2xl bg-white py-12 text-center text-base font-medium text-slate-500 shadow-sm border border-slate-200">
                  Nama yang dicari tidak ditemukan.
                </div>
              ) : (
                filteredMinggu.map(({ mingguKe, tglKocokan, pemenang, namaAsli }) => {
                  const isMingguIni = mingguKe === mingguAktif
                  const isMasaLalu = mingguKe < mingguAktif

                  return (
                    <div
                      key={mingguKe}
                      className={`rounded-2xl p-5 shadow-sm transition-all border ${isMingguIni
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20'
                          : 'bg-white border-slate-200/80'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          {/* Nomor Minggu - Besar & Kontras */}
                          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-base font-black ${isMingguIni
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-700'
                            }`}>
                            {mingguKe}
                          </span>

                          <div className="space-y-1">
                            <p className="text-base font-bold text-slate-900">
                              Minggu ke-{mingguKe}
                            </p>

                            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-500">
                              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                              {tglKocokan}
                            </p>

                            {pemenang ? (
                              <div className="mt-2 inline-flex flex-col gap-0.5 rounded-xl bg-amber-100 border border-amber-200 px-3 py-1.5 shadow-xs">
                                <span className="text-xs font-bold text-amber-800">Pemenang</span>
                                <span className="text-sm font-bold text-amber-900">{pemenang}</span>
                                {namaAsli && (
                                  <span className="text-xs font-medium text-amber-700">{namaAsli}</span>
                                )}
                              </div>
                            ) : (
                              <p className="flex items-center gap-1.5 text-sm font-medium text-slate-400 mt-1">
                                {isMasaLalu ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 text-slate-300" />
                                    <span>Selesai (Tidak ada pemenang)</span>
                                  </>
                                ) : (
                                  <>
                                    <Gift className="h-4 w-4 text-slate-300 animate-pulse" />
                                    <span>Belum dikocok</span>
                                  </>
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Badge Minggu Ini - Lebih Terlihat */}
                        {isMingguIni && (
                          <span className="shrink-0 rounded-full bg-emerald-600 px-3 py-1 text-xs font-black tracking-wider text-white shadow-xs animate-pulse">
                            MINGGU INI
                          </span>
                        )}
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