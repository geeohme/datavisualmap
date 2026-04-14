'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { updateMapping, confirmMapping, deleteMapping } from '@/lib/db/mappings'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { MAPPING_TYPES, type MappingTypeEnum } from '@/lib/domain/enums'
import type { Mapping } from '@/lib/domain/types'

export function MappingForm({
  mapping, projectId, onDelete,
}: {
  mapping: Mapping; projectId: string; onDelete: () => void
}) {
  const invalidate = useInvalidateProject()
  const [local, setLocal] = useState(mapping)
  useEffect(() => setLocal(mapping), [mapping])

  async function save(patch: Partial<Mapping>) {
    try {
      await updateMapping(createClient(), mapping.id, patch as any)
      invalidate(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function onConfirm() {
    try {
      await confirmMapping(createClient(), mapping.id)
      invalidate(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Confirm failed')
    }
  }

  async function onDeleteClick() {
    if (!confirm('Delete this mapping?')) return
    try {
      await deleteMapping(createClient(), mapping.id)
      invalidate(projectId)
      onDelete()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Mapping</div>
      <label className="block">
        <div className="mb-1 text-xs text-neutral-500">Type</div>
        <select
          className="w-full rounded border px-2 py-1"
          value={local.mapping_type}
          onChange={e => {
            const v = e.target.value as MappingTypeEnum
            setLocal({ ...local, mapping_type: v })
            save({ mapping_type: v })
          }}
        >
          {MAPPING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      <label className="block">
        <div className="mb-1 text-xs text-neutral-500">Transformation note</div>
        <textarea
          rows={4}
          className="w-full rounded border px-2 py-1"
          value={local.transformation_note ?? ''}
          onChange={e => setLocal({ ...local, transformation_note: e.target.value })}
          onBlur={() => save({ transformation_note: local.transformation_note || null })}
        />
      </label>
      <div className="flex gap-2">
        <button
          onClick={onConfirm}
          disabled={local.confidence === 'confirmed'}
          className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
        >
          {local.confidence === 'confirmed' ? 'Confirmed' : 'Confirm'}
        </button>
        <button onClick={onDeleteClick} className="rounded bg-red-600 px-3 py-1 text-white">Delete</button>
      </div>
    </div>
  )
}
