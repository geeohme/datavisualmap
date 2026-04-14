import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProject } from '@/lib/db/projects'
import { Workspace } from '@/components/project/Workspace'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const project = await getProject(supabase, id)
  if (!project) notFound()
  return <Workspace project={project} />
}
