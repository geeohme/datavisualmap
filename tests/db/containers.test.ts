import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import {
  createContainer, listContainers, updateContainerPosition, deleteContainer,
} from '@/lib/db/containers'

describe('lib/db/containers', () => {
  beforeEach(async () => { await resetDb() })

  it('creates, lists, moves, deletes a container', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const project = await createProject(client, { name: 'P' })
    const c = await createContainer(client, {
      project_id: project.id, name: 'Customers', container_type: 'source',
    })
    expect(c.name).toBe('Customers')
    const list = await listContainers(client, project.id)
    expect(list).toHaveLength(1)
    const moved = await updateContainerPosition(client, c.id, 100, 200)
    expect(moved.position_x).toBe(100)
    expect(moved.position_y).toBe(200)
    await deleteContainer(client, c.id)
    expect(await listContainers(client, project.id)).toHaveLength(0)
  })
})
