import type { SupabaseClient } from '@supabase/supabase-js'
import { ProjectInputSchema } from '@/lib/domain/schemas'
import type { Project, ProjectInput } from '@/lib/domain/types'

export async function createProject(client: SupabaseClient, input: ProjectInput): Promise<Project> {
  const parsed = ProjectInputSchema.parse(input)
  const { data: userData } = await client.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')
  const { data, error } = await client
    .from('projects')
    .insert({ ...parsed, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function listProjects(client: SupabaseClient): Promise<Project[]> {
  const { data, error } = await client
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Project[]
}

export async function getProject(client: SupabaseClient, id: string): Promise<Project | null> {
  const { data, error } = await client.from('projects').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return (data as Project | null) ?? null
}

export async function updateProject(
  client: SupabaseClient, id: string, patch: Partial<ProjectInput>,
): Promise<Project> {
  const { data, error } = await client
    .from('projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Project
}

export async function deleteProject(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('projects').delete().eq('id', id)
  if (error) throw error
}
