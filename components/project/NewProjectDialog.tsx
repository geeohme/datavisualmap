'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/browser'
import { createProject } from '@/lib/db/projects'

export function NewProjectDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const p = await createProject(supabase, { name, description: description || null })
      toast.success('Project created')
      setOpen(false)
      router.push(`/projects/${p.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create project')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >New project</button>
    )
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form onSubmit={onSubmit} className="w-96 space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New project</h2>
        <input
          autoFocus required value={name} onChange={e => setName(e.target.value)}
          placeholder="Project name"
          className="w-full rounded border px-3 py-2 text-sm"
        />
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded border px-3 py-2 text-sm"
          rows={3}
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={saving || !name} className="rounded bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  )
}
