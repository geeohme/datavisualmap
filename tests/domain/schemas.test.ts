import { describe, expect, it } from 'vitest'
import { ContainerInputSchema, DataElementInputSchema, MappingInputSchema } from '@/lib/domain/schemas'

describe('domain schemas', () => {
  it('ContainerInput requires name and valid type', () => {
    expect(ContainerInputSchema.safeParse({ name: '', container_type: 'source', project_id: 'p' }).success).toBe(false)
    expect(ContainerInputSchema.safeParse({ name: 'C', container_type: 'bogus', project_id: 'p' }).success).toBe(false)
    expect(
      ContainerInputSchema.safeParse({ name: 'C', container_type: 'source', project_id: 'p' }).success,
    ).toBe(true)
  })

  it('DataElementInput requires non-empty display_label', () => {
    expect(DataElementInputSchema.safeParse({ container_id: 'c', display_label: '' }).success).toBe(false)
    expect(DataElementInputSchema.safeParse({ container_id: 'c', display_label: 'x' }).success).toBe(true)
  })

  it('MappingInput requires at least one source and one target', () => {
    const ok = MappingInputSchema.safeParse({
      project_id: 'p', source_element_ids: ['a'], target_element_ids: ['b'],
    })
    expect(ok.success).toBe(true)
    const bad = MappingInputSchema.safeParse({
      project_id: 'p', source_element_ids: [], target_element_ids: ['b'],
    })
    expect(bad.success).toBe(false)
  })
})
