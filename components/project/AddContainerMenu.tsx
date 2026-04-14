'use client'
import { useState } from 'react'
import { NewContainerDialog } from './NewContainerDialog'
import { CsvPasteDialog } from '@/components/import/CsvPasteDialog'

export function AddContainerMenu({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'menu' | 'manual' | 'csv'>('menu')

  return (
    <>
      <button
        onClick={() => { setMode('menu'); setOpen(true) }}
        className="w-full rounded bg-neutral-900 px-3 py-2 text-sm text-white"
      >+ Add container</button>
      {open && mode === 'menu' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-72 space-y-2 rounded-lg bg-white p-4 shadow-xl">
            <button className="w-full rounded border px-3 py-2 text-left text-sm" onClick={() => setMode('manual')}>
              Manual entry
            </button>
            <button className="w-full rounded border px-3 py-2 text-left text-sm" onClick={() => setMode('csv')}>
              Paste CSV
            </button>
            <button className="w-full px-3 py-2 text-right text-sm text-neutral-500" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <NewContainerDialog
        projectId={projectId}
        open={open && mode === 'manual'}
        onClose={() => { setOpen(false); setMode('menu') }}
      />
      <CsvPasteDialog
        projectId={projectId}
        open={open && mode === 'csv'}
        onClose={() => { setOpen(false); setMode('menu') }}
        onConfirm={() => { setOpen(false); setMode('menu') }}
      />
    </>
  )
}
