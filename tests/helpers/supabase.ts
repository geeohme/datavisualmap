import { createClient, SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export function serviceClient(): SupabaseClient {
  return createClient(URL, SERVICE, { auth: { persistSession: false } })
}

export function anonClient(): SupabaseClient {
  return createClient(URL, ANON, { auth: { persistSession: false } })
}

export async function signInTestUser(
  client: SupabaseClient,
  email = 'test@local.dev',
  password = 'testpassword123',
): Promise<string> {
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.user!.id
}

export async function resetDb() {
  const svc = serviceClient()
  const uuidTables = ['mappings', 'data_elements', 'containers', 'project_members', 'projects']
  await svc.from('audit_log').delete().gt('id', 0)
  for (const t of uuidTables) {
    await svc.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000')
  }
}
