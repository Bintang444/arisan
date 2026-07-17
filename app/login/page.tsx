'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      setErrorMsg('Email atau password salah.')
      return
    }

    router.push('/admin')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 antialiased">
      <div className="w-full max-w-sm">
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-center text-white shadow-md">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Arisan Mingguan
          </h1>
          <p className="mt-1.5 text-sm font-medium text-emerald-100">
            Login admin untuk mengelola
          </p>
        </div>

        <Link
          href="/"
          className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Beranda
        </Link>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          {errorMsg && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-sm font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@email.com"
                className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-600/10 placeholder:text-slate-400 font-medium text-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-800 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memproses...
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
