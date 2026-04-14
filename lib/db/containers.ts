import type { SupabaseClient } from '@supabase/supabase-js'
import { ContainerInputSchema } from '@/lib/domain/schemas'
import type { Container, ContainerInput } from '@/lib/domain/types'

export async function createContainer(
  client: SupabaseClient, input: ContainerInput,
): Promise<Container> {
  const parsed = ContainerInputSchema.parse(input)
  const { data, error } = await client.from('containers').insert(parsed).select().single()
  if (error) throw error
  return data as Container
}

export async function listContainers(client: SupabaseClient, projectId: string): Promise<Container[]> {
  const { data, error } = await client
    .from('containers')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Container[]
}

export async function updateContainer(
  client: SupabaseClient, id: string, patch: Partial<ContainerInput> & { collapsed?: boolean },
): Promise<Container> {
  const { data, error } = await client
    .from('containers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as Container
}

export async function updateContainerPosition(
  client: SupabaseClient, id: string, x: number, y: number,
): Promise<Container> {
  return updateContainer(client, id, { position_x: x, position_y: y } as Partial<ContainerInput>)
}

export async function deleteContainer(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('containers').delete().eq('id', id)
  if (error) throw error
}
