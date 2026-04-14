'use client'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Canvas } from '@/components/canvas/Canvas'
import { Inspector } from '@/components/inspector/Inspector'
import { useProjectData } from '@/lib/hooks/useProjectData'
import type { Project } from '@/lib/domain/types'

export type Selection =
  | { kind: 'none' }
  | { kind: 'element'; id: string }
  | { kind: 'mapping'; id: string }

export function Workspace({ project }: { project: Project }) {
  const [selection, setSelection] = useState<Selection>({ kind: 'none' })
  const query = useProjectData(project.id)

  if (query.isLoading || !query.data) {
    return <div className="p-8 text-sm text-neutral-500">Loading…</div>
  }
  const data = query.data

  return (
    <div className="grid h-screen grid-cols-[280px_1fr_360px] grid-rows-[48px_1fr]">
      <header className="col-span-3 flex items-center justify-between border-b bg-white px-4">
        <div className="font-semibold">{project.name}</div>
      </header>
      <Sidebar project={project} data={data} onSelect={setSelection} selection={selection} />
      <Canvas project={project} data={data} selection={selection} onSelect={setSelection} />
      <Inspector project={project} data={data} selection={selection} onSelect={setSelection} />
    </div>
  )
}
