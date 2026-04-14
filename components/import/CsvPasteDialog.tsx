'use client'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createContainer } from '@/lib/db/containers'
import { createElements } from '@/lib/db/elements'
import { useInvalidateProject } from '@/lib/hooks/useProjectData'
import { parseCsvForImport, type CsvImportResult } from './csvParser'
import { CONTAINER_TYPES, type ContainerType } from '@/lib/domain/enums'

export function CsvPasteDialog({
  projectId, open, onClose, onConfirm,
}: { projectId: string; open: boolean; onClose: () => void; onConfirm: () => void }) {
  const invalidate = useInvalidateProject()
  const [name, setName] = useState('')
  const [type, setType] = useState<ContainerType>('source')
  const [systemName, setSystemName] = useState('')
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)

  const parseResult = useMemo<{ ok: true; value: CsvImportResult } | { ok: false; error: string } | null>(() => {
    if (!raw.trim()) return null
    try { return { ok: true, value: parseCsvForImport(raw) } }
    catch (err) { return { ok: false, error: err instanceof Error ? err.message : String(err) } }
  }, [raw])

  if (!open) return null

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parseResult || !parseResult.ok) return
    setSaving(true)
    try {
      const supabase = createClient()
      const container = await createContainer(supabase, {
        project_id: projectId, name, container_type: type, system_name: systemName || null,
        position_x: 40, position_y: 40,
      })
      await createElements(supabase, parseResult.value.fields.map((f, i) => ({
        container_id: container.id,
        display_label: f.display_label,
        data_type: f.data_type,
        sort_order: i,
        tags: [],
        fidelity: 'full' as const,
        status: 'unmapped' as const,
      })))
      invalidate(projectId)
      toast.success(`Imported ${parseResult.value.fields.length} fields`)
      onConfirm()
      setName(''); setSystemName(''); setRaw('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-[560px] max-h-[80vh] space-y-4 overflow-auto rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Paste CSV</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label>
            <div className="mb-1 text-xs text-neutral-500">Container name</div>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full rounded border px-2 py-1" aria-label="Container name" />
          </label>
          <label>
            <div className="mb-1 text-xs text-neutral-500">Type</div>
            <select value={type} onChange={e => setType(e.target.value as ContainerType)}
              className="w-full rounded border px-2 py-1">
              {CONTAINER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="col-span-2">
            <div className="mb-1 text-xs text-neutral-500">System name (optional)</div>
            <input value={systemName} onChange={e => setSystemName(e.target.value)}
              className="w-full rounded border px-2 py-1" />
          </label>
        </div>
        <label className="block text-sm">
          <div className="mb-1 text-xs text-neutral-500">CSV (first row = headers, optional second row of SQL types)</div>
          <textarea aria-label="CSV" rows={6} value={raw} onChange={e => setRaw(e.target.value)}
            className="w-full rounded border px-2 py-1 font-mono" />
        </label>
        {parseResult && !parseResult.ok && (
          <div className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{parseResult.error}</div>
        )}
        {parseResult && parseResult.ok && (
          <div className="rounded border text-sm">
            <div className="border-b bg-neutral-50 px-3 py-1 text-xs uppercase tracking-wide text-neutral-500">
              Preview ({parseResult.value.fields.length} fields{parseResult.value.detectedTypeRow ? ', type row detected' : ''})
            </div>
            <ul className="max-h-48 overflow-auto">
              {parseResult.value.fields.map((f, i) => (
                <li key={i} className="flex justify-between px-3 py-1">
                  <span>{f.display_label}</span>
                  <span className="text-neutral-500">{f.data_type ?? ''}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button
            type="submit"
            disabled={saving || !name || !parseResult || !parseResult.ok}
            className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >{saving ? 'Importing…' : 'Import'}</button>
        </div>
      </form>
    </div>
  )
}
