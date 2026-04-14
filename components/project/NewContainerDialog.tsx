'use client'
import { useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createContainer } from '@/lib/db/containers'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { CONTAINER_TYPES, type ContainerType } from '@/lib/domain/enums'

export function NewContainerDialog({
  projectId, open, onClose,
}: { projectId: string; open: boolean; onClose: () => void }) {
  const invalidate = useInvalidateProject()
  const [name, setName] = useState('')
  const [type, setType] = useState<ContainerType>('source')
  const [systemName, setSystemName] = useState('')
  const [saving, setSaving] = useState(false)

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await createContainer(createClient(), {
        project_id: projectId, name, container_type: type, system_name: systemName || null,
        position_x: 40, position_y: 40,
      })
      invalidate(projectId)
      toast.success('Container added')
      onClose()
      setName(''); setSystemName(''); setType('source')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New container</h2>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">Name</div>
          <input required value={name} onChange={e => setName(e.target.value)}
            className="w-full rounded border px-2 py-1" />
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">Type</div>
          <select value={type} onChange={e => setType(e.target.value as ContainerType)}
            className="w-full rounded border px-2 py-1">
            {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">System name (optional)</div>
          <input value={systemName} onChange={e => setSystemName(e.target.value)}
            className="w-full rounded border px-2 py-1" />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving || !name}
            className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
