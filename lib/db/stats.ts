import type { SupabaseClient } from '@supabase/supabase-js'
import type { ElementStatus } from '@/lib/domain/enums'

export interface ProjectStats {
  total: number
  unmapped: number
  mapped: number
  confirmed: number
  not_needed: number
  blocked: number
  in_review: number
}

export async function getProjectStats(
  client: SupabaseClient, projectId: string,
): Promise<ProjectStats> {
  const { data, error } = await client
    .from('data_elements')
    .select('status, containers!inner(project_id)')
    .eq('containers.project_id', projectId)
  if (error) throw error
  const stats: ProjectStats = {
    total: 0, unmapped: 0, mapped: 0, confirmed: 0, not_needed: 0, blocked: 0, in_review: 0,
  }
  for (const row of data ?? []) {
    stats.total += 1
    const s = (row as { status: ElementStatus }).status
    stats[s] = (stats[s] ?? 0) + 1
  }
  return stats
}
