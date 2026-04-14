import { describe, expect, it } from 'vitest'
import { parseCsvForImport } from '@/components/import/csvParser'

describe('parseCsvForImport', () => {
  it('uses first row as headers', () => {
    const out = parseCsvForImport('name,email,age\nalice,a@x,30')
    expect(out.fields).toEqual([
      { display_label: 'name', data_type: null },
      { display_label: 'email', data_type: null },
      { display_label: 'age', data_type: null },
    ])
    expect(out.detectedTypeRow).toBe(false)
  })

  it('detects a type row when second row looks like SQL types', () => {
    const out = parseCsvForImport('id,name,created_at\nint,varchar,date')
    expect(out.detectedTypeRow).toBe(true)
    expect(out.fields).toEqual([
      { display_label: 'id', data_type: 'int' },
      { display_label: 'name', data_type: 'varchar' },
      { display_label: 'created_at', data_type: 'date' },
    ])
  })

  it('handles tab-separated input', () => {
    const out = parseCsvForImport('a\tb\tc')
    expect(out.fields.map(f => f.display_label)).toEqual(['a', 'b', 'c'])
  })

  it('rejects empty input', () => {
    expect(() => parseCsvForImport('')).toThrow(/empty/i)
  })

  it('rejects input with no headers', () => {
    expect(() => parseCsvForImport('\n')).toThrow(/header/i)
  })
})
