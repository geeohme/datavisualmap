import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import { createContainer } from '@/lib/db/containers'
import {
  createElement, createElements, listElementsByContainer, updateElement, deleteElement,
} from '@/lib/db/elements'

describe('lib/db/elements', () => {
  beforeEach(async () => { await resetDb() })

  it('creates single and bulk elements, updates, deletes', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const project = await createProject(client, { name: 'P' })
    const container = await createContainer(client, {
      project_id: project.id, name: 'Customers', container_type: 'source',
    })
    const one = await createElement(client, { container_id: container.id, display_label: 'id' })
    expect(one.display_label).toBe('id')
    const many = await createElements(client, [
      { container_id: container.id, display_label: 'name' },
      { container_id: container.id, display_label: 'email' },
    ])
    expect(many).toHaveLength(2)
    const list = await listElementsByContainer(client, container.id)
    expect(list).toHaveLength(3)
    const updated = await updateElement(client, one.id, { status: 'confirmed' })
    expect(updated.status).toBe('confirmed')
    await deleteElement(client, one.id)
    expect(await listElementsByContainer(client, container.id)).toHaveLength(2)
  })
})
