import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import { createContainer } from '@/lib/db/containers'
import { createElements, updateElement } from '@/lib/db/elements'
import { getProjectStats } from '@/lib/db/stats'

describe('lib/db/stats', () => {
  beforeEach(async () => { await resetDb() })

  it('counts elements by status', async () => {
    const client = anonClient()
    await signInTestUser(client)
    const p = await createProject(client, { name: 'P' })
    const c = await createContainer(client, { project_id: p.id, name: 'C', container_type: 'source', position_x: 0, position_y: 0 })
    const elBase = { tags: [] as string[], fidelity: 'full' as const, status: 'unmapped' as const }
    const [a, , ] = await createElements(client, [
      { container_id: c.id, display_label: 'a', ...elBase, sort_order: 0 },
      { container_id: c.id, display_label: 'b', ...elBase, sort_order: 1 },
      { container_id: c.id, display_label: 'c', ...elBase, sort_order: 2 },
    ])
    await updateElement(client, a.id, { status: 'confirmed' })
    const stats = await getProjectStats(client, p.id)
    expect(stats.total).toBe(3)
    expect(stats.unmapped).toBe(2)
    expect(stats.confirmed).toBe(1)
    expect(stats.mapped).toBe(0)
    expect(stats.not_needed).toBe(0)
    expect(stats.blocked).toBe(0)
    expect(stats.in_review).toBe(0)
  })
})
