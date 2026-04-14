'use client'
import { createClient } from '@/lib/supabase/browser'

export default function LoginPage() {
  const supabase = createClient()
  async function signIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-80 space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Data Visual Map</h1>
        <p className="text-sm text-neutral-600">Sign in to continue.</p>
        <button
          onClick={signIn}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-white hover:bg-neutral-800"
        >
          Continue with Google
        </button>
      </div>
    </main>
  )
}
