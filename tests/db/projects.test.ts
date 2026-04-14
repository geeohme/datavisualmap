import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject, listProjects, getProject } from '@/lib/db/projects'

describe('lib/db/projects', () => {
  beforeEach(async () => { await resetDb() })

  it('creates a project and lists it', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const p = await createProject(client, { name: 'Acme Migration', description: null })
    expect(p.name).toBe('Acme Migration')
    const list = await listProjects(client)
    expect(list.map(r => r.id)).toContain(p.id)
  })

  it('getProject returns null when not a member', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const got = await getProject(client, '00000000-0000-0000-0000-000000000000')
    expect(got).toBeNull()
  })
})
