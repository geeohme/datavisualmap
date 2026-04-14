'use client'
import { ElementForm } from './ElementForm'
import { MappingForm } from './MappingForm'
import { ProjectSummary } from './ProjectSummary'
import type { ProjectData } from '@/lib/hooks/useProjectData'
import type { Project } from '@/lib/domain/types'
import type { Selection } from '@/components/project/Workspace'

export function Inspector({
  project, data, selection, onSelect,
}: {
  project: Project
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  let body: React.ReactNode
  if (selection.kind === 'element') {
    const el = data.elements.find(e => e.id === selection.id)
    body = el
      ? <ElementForm element={el} projectId={project.id} />
      : <div className="p-4 text-sm text-neutral-500">Element not found.</div>
  } else if (selection.kind === 'mapping') {
    const m = data.mappings.find(x => x.id === selection.id)
    body = m
      ? <MappingForm mapping={m} projectId={project.id} onDelete={() => onSelect({ kind: 'none' })} />
      : <div className="p-4 text-sm text-neutral-500">Mapping not found.</div>
  } else {
    body = <ProjectSummary project={project} stats={data.stats} />
  }
  return <aside className="overflow-auto border-l bg-white">{body}</aside>
}
