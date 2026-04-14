import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listProjects } from '@/lib/db/projects'
import { NewProjectDialog } from '@/components/project/NewProjectDialog'

export default async function ProjectsPage() {
  const supabase = await createClient()
  const projects = await listProjects(supabase)
  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <NewProjectDialog />
      </div>
      <ul className="mt-8 divide-y rounded-lg border bg-white">
        {projects.length === 0 && (
          <li className="p-6 text-sm text-neutral-500">No projects yet. Create one to get started.</li>
        )}
        {projects.map(p => (
          <li key={p.id}>
            <Link href={`/projects/${p.id}`} className="block p-4 hover:bg-neutral-50">
              <div className="font-medium">{p.name}</div>
              {p.description && <div className="text-sm text-neutral-500">{p.description}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
