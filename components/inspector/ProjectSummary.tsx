'use client'
import type { Project } from '@/lib/domain/types'
import type { ProjectStats } from '@/lib/db/stats'

export function ProjectSummary({ project, stats }: { project: Project; stats: ProjectStats }) {
  return (
    <div className="p-4 text-sm">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Project</div>
      <div className="mb-2 text-lg font-semibold">{project.name}</div>
      {project.description && <p className="mb-4 text-neutral-600">{project.description}</p>}
      <div className="text-neutral-500">Select a field or mapping to see details.</div>
      <div className="mt-4 text-xs text-neutral-400">{stats.total} elements · {stats.confirmed} confirmed</div>
    </div>
  )
}
