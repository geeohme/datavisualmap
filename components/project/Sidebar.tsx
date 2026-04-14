'use client'
import { Dashboard } from './Dashboard'
import { ProjectTree } from './ProjectTree'
import { AddContainerMenu } from './AddContainerMenu'
import type { ProjectData } from '@/lib/hooks/useProjectData'
import type { Selection } from './Workspace'
import type { Project } from '@/lib/domain/types'

export function Sidebar({
  project, data, selection, onSelect,
}: {
  project: Project
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  return (
    <aside className="flex flex-col border-r bg-white">
      <div className="p-4"><AddContainerMenu projectId={project.id} /></div>
      <Dashboard stats={data.stats} />
      <ProjectTree data={data} selection={selection} onSelect={onSelect} />
    </aside>
  )
}
