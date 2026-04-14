import Papa from 'papaparse'

const SQL_TYPE_HINT = /^(int|integer|bigint|smallint|numeric|decimal|float|real|double|text|varchar|char|date|timestamp|timestamptz|time|boolean|bool|uuid|json|jsonb)(\(.*\))?$/i

export interface CsvImportField {
  display_label: string
  data_type: string | null
}

export interface CsvImportResult {
  fields: CsvImportField[]
  detectedTypeRow: boolean
}

export function parseCsvForImport(raw: string): CsvImportResult {
  if (!raw) throw new Error('CSV input is empty')
  const text = raw.trim()
  if (!text) throw new Error('No header row found')
  const delimiter = text.includes('\t') && !text.includes(',') ? '\t' : ','
  const parsed = Papa.parse<string[]>(text, { delimiter, skipEmptyLines: true })
  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`)
  }
  const rows = parsed.data
  if (rows.length === 0 || rows[0].length === 0 || rows[0].every(h => !h?.trim())) {
    throw new Error('No header row found')
  }
  const headers = rows[0].map(h => h.trim())
  const maybeTypes = rows[1]?.map(c => (c ?? '').trim()) ?? []
  const detectedTypeRow =
    maybeTypes.length === headers.length &&
    maybeTypes.every(c => c && SQL_TYPE_HINT.test(c))
  const fields: CsvImportField[] = headers.map((h, i) => ({
    display_label: h,
    data_type: detectedTypeRow ? maybeTypes[i] : null,
  }))
  return { fields, detectedTypeRow }
}
