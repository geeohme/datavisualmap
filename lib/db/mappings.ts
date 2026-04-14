import type { SupabaseClient } from '@supabase/supabase-js'
import { MappingInputSchema } from '@/lib/domain/schemas'
import type { Mapping, MappingInput } from '@/lib/domain/types'

export async function createMapping(client: SupabaseClient, input: MappingInput): Promise<Mapping> {
  const parsed = MappingInputSchema.parse(input)
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('mappings')
    .insert({ ...parsed, created_by: userData.user?.id ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Mapping
}

export async function listMappings(client: SupabaseClient, projectId: string): Promise<Mapping[]> {
  const { data, error } = await client
    .from('mappings')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Mapping[]
}

export async function updateMapping(
  client: SupabaseClient, id: string,
  patch: Partial<Pick<MappingInput, 'mapping_type' | 'transformation_note' | 'source_element_ids' | 'target_element_ids'>>,
): Promise<Mapping> {
  const { data, error } = await client
    .from('mappings')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Mapping
}

export async function confirmMapping(client: SupabaseClient, id: string): Promise<Mapping> {
  const { data: userData } = await client.auth.getUser()
  const { data, error } = await client
    .from('mappings')
    .update({
      confidence: 'confirmed',
      confirmed_by: userData.user?.id ?? null,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Mapping
}

export async function deleteMapping(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('mappings').delete().eq('id', id)
  if (error) throw error
}
