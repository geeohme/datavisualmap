'use client'
import type { ProjectData } from '@/lib/hooks/useProjectData'
import type { Selection } from './Workspace'
import type { ContainerType } from '@/lib/domain/enums'

const GROUPS: { type: ContainerType; label: string }[] = [
  { type: 'source', label: 'Sources' },
  { type: 'target', label: 'Targets' },
  { type: 'transformation', label: 'Transformations' },
  { type: 'report', label: 'Reports' },
  { type: 'category', label: 'Categories' },
]

export function ProjectTree({
  data, selection, onSelect,
}: {
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  return (
    <nav className="flex-1 overflow-auto p-2 text-sm">
      {GROUPS.map(g => {
        const containers = data.containers.filter(c => c.container_type === g.type)
        if (containers.length === 0) return null
        return (
          <div key={g.type} className="mb-3">
            <div className="px-2 text-xs font-medium uppercase tracking-wide text-neutral-500">{g.label}</div>
            <ul>
              {containers.map(c => {
                const fields = data.elements.filter(e => e.container_id === c.id)
                return (
                  <li key={c.id}>
                    <div className="px-2 py-1 font-medium">{c.name}</div>
                    <ul className="ml-4">
                      {fields.map(f => {
                        const isSelected = selection.kind === 'element' && selection.id === f.id
                        return (
                          <li
                            key={f.id}
                            onClick={() => onSelect({ kind: 'element', id: f.id })}
                            className={`cursor-pointer px-2 py-0.5 ${isSelected ? 'bg-blue-100' : 'hover:bg-neutral-100'}`}
                          >{f.display_label}</li>
                        )
                      })}
                    </ul>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
