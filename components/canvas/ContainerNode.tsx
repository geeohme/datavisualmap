'use client'
import { Handle, Position, type NodeProps } from '@xyflow/react'
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
  container: Pick<Container, 'name' | 'container_type' | 'system_name' | 'collapsed'>
  fields: Pick<DataElement, 'id' | 'display_label' | 'status'>[]
}

export function ContainerNode({ data, selected }: NodeProps) {
  const { container, fields } = data as unknown as ContainerNodeData
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
        <ul className="min-w-[220px] py-1">
          {fields.map(f => (
            <li
              key={f.id}
              className={`relative flex items-center border-l-4 px-3 py-1 text-sm ${STATUS_BORDER[f.status]}`}
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
          ))}
          {fields.length === 0 && (
            <li className="px-3 py-2 text-xs italic text-neutral-400">No fields yet</li>
          )}
        </ul>
      )}
    </div>
  )
}
