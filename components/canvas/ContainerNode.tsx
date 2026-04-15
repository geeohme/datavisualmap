'use client'
import { useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createElement } from '@/lib/db/elements'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import type { Container, DataElement } from '@/lib/domain/types'
import type { ElementStatus } from '@/lib/domain/enums'

const STATUS_BORDER: Record<ElementStatus, string> = {
  unmapped: 'border-l-neutral-300',
  mapped: 'border-l-blue-500',
  confirmed: 'border-l-emerald-500',
  in_review: 'border-l-amber-500',
  not_needed: 'border-l-neutral-300 line-through text-neutral-400',
  blocked: 'border-l-red-500',
}

export interface ContainerNodeData {
  container: Pick<Container, 'id' | 'name' | 'container_type' | 'system_name' | 'collapsed'>
  fields: Pick<DataElement, 'id' | 'display_label' | 'status'>[]
  projectId: string
  selectedElementId: string | null
  onSelectElement: (id: string) => void
}

export function ContainerNode({ data, selected }: NodeProps) {
  const { container, fields, projectId, selectedElementId, onSelectElement } =
    data as unknown as ContainerNodeData
  const invalidate = useInvalidateProject()
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)

  async function submitField(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    const trimmed = label.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await createElement(createClient(), {
        container_id: container.id,
        display_label: trimmed,
        tags: [],
        fidelity: 'label_only',
        status: 'unmapped',
        sort_order: fields.length,
      })
      invalidate(projectId)
      setLabel('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add field')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-md border bg-white shadow-sm ${selected ? 'ring-2 ring-blue-500' : ''}`}>
      <div className="flex items-center justify-between gap-2 border-b bg-neutral-50 px-3 py-2">
        <div>
          <div className="text-sm font-semibold">{container.name}</div>
          {container.system_name && <div className="text-xs text-neutral-500">{container.system_name}</div>}
        </div>
        <span className="rounded bg-neutral-200 px-2 py-0.5 text-xs uppercase tracking-wide text-neutral-700">
          {container.container_type}
        </span>
      </div>
      {!container.collapsed && (
        <ul className="min-w-[240px] py-1">
          {fields.map(f => {
            const isSelected = selectedElementId === f.id
            return (
              <li
                key={f.id}
                onClick={e => { e.stopPropagation(); onSelectElement(f.id) }}
                className={`relative flex cursor-pointer items-center border-l-4 px-3 py-1 text-sm ${STATUS_BORDER[f.status]} ${isSelected ? 'bg-blue-50' : 'hover:bg-neutral-50'}`}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${f.id}-t`}
                  className="!h-2 !w-2 !border-neutral-400 !bg-white"
                />
                <span className="flex-1">{f.display_label}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${f.id}-s`}
                  className="!h-2 !w-2 !border-neutral-400 !bg-white"
                />
              </li>
            )
          })}
          {fields.length === 0 && !adding && (
            <li className="px-3 py-2 text-xs italic text-neutral-400">No fields yet</li>
          )}
          {adding ? (
            <li className="px-3 py-2">
              <form onSubmit={submitField} className="flex gap-1">
                <input
                  autoFocus
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  onBlur={() => { if (!label.trim()) setAdding(false) }}
                  placeholder="Field name"
                  className="nodrag flex-1 rounded border px-2 py-1 text-xs"
                  onClick={e => e.stopPropagation()}
                />
                <button
                  type="submit"
                  disabled={saving || !label.trim()}
                  className="rounded bg-neutral-900 px-2 text-xs text-white disabled:opacity-40"
                >Add</button>
              </form>
            </li>
          ) : (
            <li
              onClick={e => { e.stopPropagation(); setAdding(true) }}
              className="cursor-pointer px-3 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
            >+ Add field</li>
          )}
        </ul>
      )}
    </div>
  )
}
