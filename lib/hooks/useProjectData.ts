'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/browser'
import { listContainers } from '@/lib/db/containers'
import { listElementsByProject } from '@/lib/db/elements'
import { listMappings } from '@/lib/db/mappings'
import { getProjectStats, type ProjectStats } from '@/lib/db/stats'
import type { Container, DataElement, Mapping } from '@/lib/domain/types'

export interface ProjectData {
  containers: Container[]
  elements: DataElement[]
  mappings: Mapping[]
  stats: ProjectStats
}

export function projectQueryKey(projectId: string) {
  return ['project', projectId] as const
}

export function useProjectData(projectId: string) {
  return useQuery({
    queryKey: projectQueryKey(projectId),
    queryFn: async (): Promise<ProjectData> => {
      const supabase = createClient()
      const [containers, elements, mappings, stats] = await Promise.all([
        listContainers(supabase, projectId),
        listElementsByProject(supabase, projectId),
        listMappings(supabase, projectId),
        getProjectStats(supabase, projectId),
      ])
      return { containers, elements, mappings, stats }
    },
  })
}

export function useInvalidateProject() {
  const qc = useQueryClient()
  return (projectId: string) => qc.invalidateQueries({ queryKey: projectQueryKey(projectId) })
}
