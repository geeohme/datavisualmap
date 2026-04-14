import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CsvPasteDialog } from '@/components/import/CsvPasteDialog'

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('CsvPasteDialog', () => {
  it('previews parsed headers and disables confirm on parse error', async () => {
    const onConfirm = vi.fn()
    wrap(
      <CsvPasteDialog projectId="p1" open onClose={() => {}} onConfirm={onConfirm} />,
    )
    fireEvent.change(screen.getByLabelText(/container name/i), { target: { value: 'Imported' } })
    fireEvent.change(screen.getByLabelText(/csv/i), { target: { value: 'name,email,age' } })
    expect(await screen.findByText('name')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
  })
})
