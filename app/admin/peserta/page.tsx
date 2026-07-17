'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Plus, Pencil, Trash2, X, Loader2, ArrowLeftRight, AlertCircle } from 'lucide-react'

type Peserta = {
  id: number
  nama_peserta: string
  nama_asli: string | null
  nominal_mingguan: number
  minggu_menang: number | null
}

export default function PesertaPage() {
  const router = useRouter()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [data, setData] = useState<Peserta[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nama_peserta: '',
    nama_asli: '',
    nominal_mingguan: '50000',
    minggu_menang: '',
  })

  const [deleteTarget, setDeleteTarget] = useState<Peserta | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ---------- State baru untuk fitur Tukar Posisi ----------
  const [swapSource, setSwapSource] = useState<Peserta | null>(null)
  const [swapTargetId, setSwapTargetId] = useState<string>('')
  const [swapping, setSwapping] = useState(false)
  const [swapError, setSwapError] = useState<string | null>(null)

  const fetchPeserta = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('peserta_arisan')
      .select('id, nama_peserta, nama_asli, nominal_mingguan, minggu_menang')
      .order('minggu_menang', { ascending: true, nullsFirst: false })

    if (error) {
      setErrorMsg(error.message)
    } else {
      setData(data ?? [])
    }
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
      await fetchPeserta()
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const openAddModal = () => {
    setEditingId(null)
    setForm({
      nama_peserta: '',
      nama_asli: '',
      nominal_mingguan: '50000',
      minggu_menang: '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const openEditModal = (p: Peserta) => {
    setEditingId(p.id)
    setForm({
      nama_peserta: p.nama_peserta,
      nama_asli: p.nama_asli ?? '',
      nominal_mingguan: String(p.nominal_mingguan),
      minggu_menang: p.minggu_menang ? String(p.minggu_menang) : '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
  }

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!form.nama_peserta.trim()) {
      setFormError('Nama peserta wajib diisi.')
      return
    }

    setSaving(true)

    const payload = {
      nama_peserta: form.nama_peserta.trim(),
      nama_asli: form.nama_asli.trim() || null,
      nominal_mingguan: parseFloat(form.nominal_mingguan) || 50000,
      minggu_menang: form.minggu_menang ? parseInt(form.minggu_menang, 10) : null,
    }

    const { error } = editingId
      ? await supabase.from('peserta_arisan').update(payload).eq('id', editingId)
      : await supabase.from('peserta_arisan').insert(payload)

    setSaving(false)

    if (error) {
      setFormError(error.message)
      return
    }

    setShowModal(false)
    fetchPeserta()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    const deletedMinggu = deleteTarget.minggu_menang

    const { error } = await supabase
      .from('peserta_arisan')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      setDeleting(false)
      setErrorMsg(error.message)
      return
    }

    if (deletedMinggu) {
      const { data: atas } = await supabase
        .from('peserta_arisan')
        .select('id, minggu_menang')
        .gt('minggu_menang', deletedMinggu)

      if (atas && atas.length > 0) {
        await Promise.all(
          atas.map((p) =>
            supabase
              .from('peserta_arisan')
              .update({ minggu_menang: (p.minggu_menang ?? 0) - 1 })
              .eq('id', p.id)
          )
        )
      }
    }

    setDeleting(false)
    setDeleteTarget(null)
    fetchPeserta()
  }

  // ---------- Fungsi baru untuk fitur Tukar Posisi ----------

  const openSwapModal = (p: Peserta) => {
    setSwapSource(p)
    setSwapTargetId('')
    setSwapError(null)
  }

  const closeSwapModal = () => {
    if (swapping) return
    setSwapSource(null)
    setSwapTargetId('')
    setSwapError(null)
  }

  const handleSwap = async () => {
    if (!swapSource || !swapTargetId) {
      setSwapError('Pilih peserta yang mau ditukar posisinya.')
      return
    }

    const target = data.find((p) => p.id === Number(swapTargetId))
    if (!target) {
      setSwapError('Peserta tujuan tidak ditemukan.')
      return
    }

    setSwapping(true)
    setSwapError(null)

    const angkaSource = swapSource.minggu_menang
    const angkaTarget = target.minggu_menang

    // Update peserta sumber dengan angka milik peserta tujuan
    const { error: error1 } = await supabase
      .from('peserta_arisan')
      .update({ minggu_menang: angkaTarget })
      .eq('id', swapSource.id)

    if (error1) {
      setSwapping(false)
      setSwapError(error1.message)
      return
    }

    // Update peserta tujuan dengan angka milik peserta sumber
    const { error: error2 } = await supabase
      .from('peserta_arisan')
      .update({ minggu_menang: angkaSource })
      .eq('id', target.id)

    setSwapping(false)

    if (error2) {
      setSwapError(error2.message)
      return
    }

    setSwapSource(null)
    setSwapTargetId('')
    fetchPeserta()
  }

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
        {/* Header dengan gradient */}
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur transition-colors hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-extrabold tracking-tight">
                Kelola Peserta
              </h1>
            </div>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-800"
        >
          <Plus className="h-5 w-5" />
          Tambah Peserta
        </button>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-base font-medium">Memuat data...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {data.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/80 bg-white py-12 text-center text-base font-medium text-slate-500 shadow-sm">
                Belum ada peserta.
              </div>
            ) : (
              data.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-emerald-100 px-1.5 text-sm font-bold text-emerald-800">
                        {p.minggu_menang ?? '-'}
                      </span>
                      <p className="truncate text-base font-bold text-slate-900">
                        {p.nama_peserta}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium text-slate-400">
                      {p.nama_asli ?? '-'} • Rp{p.nominal_mingguan.toLocaleString('id-ID')}/minggu
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => openSwapModal(p)}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-600 transition-colors hover:bg-emerald-100"
                      title="Tukar Posisi"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(p)}
                      className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Peserta' : 'Tambah Peserta'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nama Peserta (panggilan)
                </label>
                <input
                  type="text"
                  name="nama_peserta"
                  value={form.nama_peserta}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nama Asli
                </label>
                <input
                  type="text"
                  name="nama_asli"
                  value={form.nama_asli}
                  onChange={handleFormChange}
                  className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Nominal/Minggu
                  </label>
                  <input
                    type="number"
                    name="nominal_mingguan"
                    value={form.nominal_mingguan}
                    onChange={handleFormChange}
                    className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Urutan Menang
                  </label>
                  <input
                    type="number"
                    name="minggu_menang"
                    value={form.minggu_menang}
                    onChange={handleFormChange}
                    placeholder="1-50"
                    className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 font-medium text-slate-900 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : editingId ? 'Update' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-bold text-slate-900">Hapus Peserta?</h2>
            <p className="mb-4 text-base font-medium text-slate-600">
              Data <span className="font-semibold">{deleteTarget.nama_peserta}</span> beserta
              seluruh riwayat setorannya akan dihapus permanen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tukar Posisi */}
      {swapSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Tukar Posisi</h2>
              <button
                onClick={closeSwapModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-4 text-base font-medium text-slate-600">
              <span className="font-bold text-slate-800">{swapSource.nama_peserta}</span>{' '}
              (posisi {swapSource.minggu_menang ?? '-'}) akan ditukar dengan:
            </p>

            {swapError && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {swapError}
              </div>
            )}

            <select
              value={swapTargetId}
              onChange={(e) => setSwapTargetId(e.target.value)}
              className="mb-4 w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 font-medium text-slate-900"
            >
              <option value="">Pilih peserta...</option>
              {data
                .filter((p) => p.id !== swapSource.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_peserta} (posisi {p.minggu_menang ?? '-'})
                  </option>
                ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={closeSwapModal}
                disabled={swapping}
                className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleSwap}
                disabled={swapping || !swapTargetId}
                className="w-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {swapping ? 'Menukar...' : 'Tukar Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}