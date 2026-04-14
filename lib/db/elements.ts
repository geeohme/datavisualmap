import type { SupabaseClient } from '@supabase/supabase-js'
import { DataElementInputSchema } from '@/lib/domain/schemas'
import type { DataElement, DataElementInput } from '@/lib/domain/types'

export async function createElement(
  client: SupabaseClient, input: DataElementInput,
): Promise<DataElement> {
  const parsed = DataElementInputSchema.parse(input)
  const { data, error } = await client.from('data_elements').insert(parsed).select().single()
  if (error) throw error
  return data as DataElement
}

export async function createElements(
  client: SupabaseClient, inputs: DataElementInput[],
): Promise<DataElement[]> {
  const parsed = inputs.map(i => DataElementInputSchema.parse(i))
  const { data, error } = await client.from('data_elements').insert(parsed).select()
  if (error) throw error
  return (data ?? []) as DataElement[]
}

export async function listElementsByContainer(
  client: SupabaseClient, containerId: string,
): Promise<DataElement[]> {
  const { data, error } = await client
    .from('data_elements')
    .select('*')
    .eq('container_id', containerId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DataElement[]
}

export async function listElementsByProject(
  client: SupabaseClient, projectId: string,
): Promise<DataElement[]> {
  const { data, error } = await client
    .from('data_elements')
    .select('*, containers!inner(project_id)')
    .eq('containers.project_id', projectId)
  if (error) throw error
  return (data ?? []) as DataElement[]
}

export async function updateElement(
  client: SupabaseClient, id: string, patch: Partial<DataElementInput>,
): Promise<DataElement> {
  const { data, error } = await client
    .from('data_elements')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as DataElement
}

export async function deleteElement(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('data_elements').delete().eq('id', id)
  if (error) throw error
}
