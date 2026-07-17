'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getTanggalMulai, updateTanggalMulai } from '@/lib/arisan-helpers'
import { ArrowLeft, Loader2, Check, AlertCircle } from 'lucide-react'

export default function PengaturanPage() {
  const router = useRouter()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [loading, setLoading] = useState(true)
  const [tanggal, setTanggal] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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

      const tanggalMulai = await getTanggalMulai()
      if (tanggalMulai) setTanggal(tanggalMulai)
      setLoading(false)
    }

    init()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(false)
    setSaving(true)

    const { error } = await updateTanggalMulai(tanggal)

    setSaving(false)

    if (error) {
      setErrorMsg(error.message)
      return
    }

    setSuccessMsg(true)
    setTimeout(() => setSuccessMsg(false), 3000)
  }

  if (checkingAuth || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 antialiased">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Memuat...
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
                Pengaturan
              </h1>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="mb-4 font-medium text-slate-500">
            Tanggal ini jadi patokan sistem untuk menghitung minggu ke berapa
            arisan sedang berjalan.
          </p>

          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
              <Check className="h-4 w-4" />
              Tanggal berhasil disimpan.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tanggal Mulai Arisan (Minggu ke-1)
              </label>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                required
                className="w-full rounded-2xl border-2 border-slate-300 px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 font-medium text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}