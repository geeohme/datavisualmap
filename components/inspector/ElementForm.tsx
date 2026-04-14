'use client'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { updateElement } from '@/lib/db/elements'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { ELEMENT_STATUSES, type ElementStatus } from '@/lib/domain/enums'
import type { DataElement } from '@/lib/domain/types'

export function ElementForm({ element, projectId }: { element: DataElement; projectId: string }) {
  const invalidate = useInvalidateProject()
  const [local, setLocal] = useState(element)
  useEffect(() => setLocal(element), [element])

  async function save(patch: Partial<DataElement>) {
    try {
      await updateElement(createClient(), element.id, patch as any)
      invalidate(projectId)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <div className="space-y-4 p-4 text-sm">
      <Field label="Display label">
        <input
          className="w-full rounded border px-2 py-1"
          value={local.display_label}
          onChange={e => setLocal({ ...local, display_label: e.target.value })}
          onBlur={() => save({ display_label: local.display_label })}
        />
      </Field>
      <Field label="DB column">
        <input
          className="w-full rounded border px-2 py-1"
          value={local.db_column_name ?? ''}
          onChange={e => setLocal({ ...local, db_column_name: e.target.value })}
          onBlur={() => save({ db_column_name: local.db_column_name || null })}
        />
      </Field>
      <Field label="Data type">
        <input
          className="w-full rounded border px-2 py-1"
          value={local.data_type ?? ''}
          onChange={e => setLocal({ ...local, data_type: e.target.value })}
          onBlur={() => save({ data_type: local.data_type || null })}
        />
      </Field>
      <Field label="Status">
        <select
          className="w-full rounded border px-2 py-1"
          value={local.status}
          onChange={e => {
            const s = e.target.value as ElementStatus
            setLocal({ ...local, status: s })
            save({ status: s })
          }}
        >
          {ELEMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Notes">
        <textarea
          rows={4}
          className="w-full rounded border px-2 py-1"
          value={local.notes ?? ''}
          onChange={e => setLocal({ ...local, notes: e.target.value })}
          onBlur={() => save({ notes: local.notes || null })}
        />
      </Field>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</div>
      {children}
    </label>
  )
}
