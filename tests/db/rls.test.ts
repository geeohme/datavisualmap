import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, serviceClient, signInTestUser } from '../helpers/supabase'
import { makeProject } from '../helpers/fixtures'

describe('RLS', () => {
  beforeEach(async () => { await resetDb() })

  it('non-members cannot see a project', async () => {
    const svc = serviceClient()
    const strangerId = '22222222-2222-2222-2222-222222222222'
    await svc.auth.admin.createUser({
      id: strangerId,
      email: 'stranger@local.dev',
      password: 'x',
      email_confirm: true,
    }).catch(() => {})
    const p = await makeProject(svc, strangerId, 'Secret')

    const anon = anonClient()
    await signInTestUser(anon)
    const { data, error } = await anon.from('projects').select('*').eq('id', p.id)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('creator becomes owner automatically', async () => {
    const anon = anonClient()
    const userId = await signInTestUser(anon)
    const { data: project, error } = await anon
      .from('projects')
      .insert({ name: 'Mine', created_by: userId })
      .select()
      .single()
    expect(error).toBeNull()
    const svc = serviceClient()
    const { data: members } = await svc
      .from('project_members')
      .select('*')
      .eq('project_id', project!.id)
    expect(members).toHaveLength(1)
    expect(members![0].role).toBe('owner')
  })
})
