'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('test@local.dev')
  const [password, setPassword] = useState('testpassword123')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    router.push('/projects')
    router.refresh()
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={signInWithPassword}
        className="w-96 space-y-4 rounded-lg border bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold">Data Visual Map</h1>
        <p className="text-sm text-neutral-600">Sign in to continue.</p>

        <label className="block text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Email</div>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            autoComplete="email"
          />
        </label>

        <label className="block text-sm">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">Password</div>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            autoComplete="current-password"
          />
        </label>

        {error && <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <div className="h-px flex-1 bg-neutral-200" />
          or
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full rounded-md border px-4 py-2 text-sm hover:bg-neutral-50"
        >
          Continue with Google
        </button>

        <p className="text-xs text-neutral-400">
          Local dev user pre-filled. Configure a real Supabase Auth provider to use Google.
        </p>
      </form>
    </main>
  )
}
