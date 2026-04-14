import { chromium, type FullConfig } from '@playwright/test'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'

loadEnv({ path: path.resolve(process.cwd(), '.env.local') })

type Captured = { name: string; value: string; options?: CookieOptions }

async function globalSetup(_config: FullConfig) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY')

  // Capture cookies emitted by @supabase/ssr during sign-in so we can inject
  // them into Playwright's browser context using the same cookie format the
  // Next.js app expects (name, value, chunking, path, etc).
  const jar = new Map<string, Captured>()

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return Array.from(jar.values()).map(({ name, value }) => ({ name, value }))
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          jar.set(name, { name, value, options })
        }
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test@local.dev',
    password: 'testpassword123',
  })
  if (error || !data.session) {
    throw new Error(`Sign-in failed: ${error?.message ?? 'no session'}`)
  }

  if (jar.size === 0) {
    // @supabase/ssr may only emit via setAll after a subsequent getAll; force
    // it by calling getUser which triggers a token refresh roundtrip.
    await supabase.auth.getUser()
  }

  if (jar.size === 0) {
    throw new Error('No Supabase cookies were captured by the SSR client')
  }

  const browser = await chromium.launch()
  const context = await browser.newContext()
  await context.addCookies(
    Array.from(jar.values()).map(({ name, value }) => ({
      name,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    })),
  )

  // Verify by hitting /projects
  const page = await context.newPage()
  await page.goto('http://localhost:3100/projects', { waitUntil: 'domcontentloaded' })
  const finalUrl = page.url()
  if (finalUrl.includes('/login')) {
    console.error('Captured cookies:', Array.from(jar.keys()))
    throw new Error(`Auth did not persist; landed on ${finalUrl}`)
  }

  await context.storageState({ path: 'tests/e2e/.auth-state.json' })
  await browser.close()
}

export default globalSetup
