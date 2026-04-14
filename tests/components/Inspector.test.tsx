import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Inspector } from '@/components/inspector/Inspector'

const dataFixture = {
  containers: [{ id: 'c1', project_id: 'p1', name: 'Customers', container_type: 'source' } as any],
  elements: [{ id: 'e1', container_id: 'c1', display_label: 'email', status: 'unmapped', tags: [] } as any],
  mappings: [],
  stats: { total: 1, unmapped: 1, mapped: 0, confirmed: 0, not_needed: 0, blocked: 0, in_review: 0 },
}

function wrap(ui: React.ReactNode) {
  const qc = new QueryClient()
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

describe('Inspector', () => {
  it('shows project summary when nothing selected', () => {
    wrap(<Inspector project={{ id: 'p1', name: 'P' } as any} data={dataFixture as any}
      selection={{ kind: 'none' }} onSelect={vi.fn()} />)
    expect(screen.getByText(/select a field or mapping/i)).toBeInTheDocument()
  })

  it('shows ElementForm for selected element', () => {
    wrap(<Inspector project={{ id: 'p1', name: 'P' } as any} data={dataFixture as any}
      selection={{ kind: 'element', id: 'e1' }} onSelect={vi.fn()} />)
    expect(screen.getByDisplayValue('email')).toBeInTheDocument()
  })
})
