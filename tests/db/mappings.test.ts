import { beforeEach, describe, expect, it } from 'vitest'
import { anonClient, resetDb, signInTestUser } from '../helpers/supabase'
import { createProject } from '@/lib/db/projects'
import { createContainer } from '@/lib/db/containers'
import { createElement } from '@/lib/db/elements'
import {
  createMapping, listMappings, updateMapping, confirmMapping, deleteMapping,
} from '@/lib/db/mappings'

describe('lib/db/mappings', () => {
  beforeEach(async () => { await resetDb() })

  it('creates, confirms, updates, deletes a mapping', async () => {
    const client = anonClient()
    const userId = await signInTestUser(client)
    const project = await createProject(client, { name: 'P' })
    const src = await createContainer(client, { project_id: project.id, name: 'Src', container_type: 'source', position_x: 0, position_y: 0 })
    const tgt = await createContainer(client, { project_id: project.id, name: 'Tgt', container_type: 'target', position_x: 0, position_y: 0 })
    const elBase = { tags: [] as string[], fidelity: 'full' as const, status: 'unmapped' as const, sort_order: 0 }
    const s1 = await createElement(client, { container_id: src.id, display_label: 'first_name', ...elBase })
    const s2 = await createElement(client, { container_id: src.id, display_label: 'last_name', ...elBase, sort_order: 1 })
    const t1 = await createElement(client, { container_id: tgt.id, display_label: 'full_name', ...elBase })

    const m = await createMapping(client, {
      project_id: project.id,
      source_element_ids: [s1.id, s2.id],
      target_element_ids: [t1.id],
      mapping_type: 'concat',
      transformation_note: "concat(first_name, ' ', last_name)",
      confidence: 'draft',
    })
    expect(m.mapping_type).toBe('concat')

    const updated = await updateMapping(client, m.id, { transformation_note: 'updated' })
    expect(updated.transformation_note).toBe('updated')

    const confirmed = await confirmMapping(client, m.id)
    expect(confirmed.confidence).toBe('confirmed')
    expect(confirmed.confirmed_by).toBe(userId)

    const list = await listMappings(client, project.id)
    expect(list).toHaveLength(1)

    await deleteMapping(client, m.id)
    expect(await listMappings(client, project.id)).toHaveLength(0)
  })
})
