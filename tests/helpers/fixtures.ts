import type { SupabaseClient } from '@supabase/supabase-js'

export async function makeProject(svc: SupabaseClient, userId: string, name = 'Test Project') {
  const { data, error } = await svc
    .from('projects')
    .insert({ name, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as { id: string; name: string }
}

export async function makeContainer(
  svc: SupabaseClient,
  projectId: string,
  overrides: Partial<{ name: string; container_type: string }> = {},
) {
  const { data, error } = await svc
    .from('containers')
    .insert({
      project_id: projectId,
      name: overrides.name ?? 'Customers',
      container_type: overrides.container_type ?? 'source',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function makeElement(svc: SupabaseClient, containerId: string, label: string) {
  const { data, error } = await svc
    .from('data_elements')
    .insert({ container_id: containerId, display_label: label })
    .select()
    .single()
  if (error) throw error
  return data
}
