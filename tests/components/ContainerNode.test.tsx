import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ReactFlowProvider } from '@xyflow/react'
import { ContainerNode } from '@/components/canvas/ContainerNode'

function renderNode(data: any) {
  return render(
    <ReactFlowProvider>
      {/* @ts-expect-error partial NodeProps for test */}
      <ContainerNode id="n1" data={data} selected={false} type="container" />
    </ReactFlowProvider>,
  )
}

describe('ContainerNode', () => {
  it('renders container name, type badge, and field rows', () => {
    renderNode({
      container: { name: 'Customers', container_type: 'source', system_name: 'Legacy BSS', collapsed: false },
      fields: [
        { id: 'e1', display_label: 'id', status: 'confirmed' },
        { id: 'e2', display_label: 'email', status: 'unmapped' },
      ],
    })
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('source')).toBeInTheDocument()
    expect(screen.getByText('Legacy BSS')).toBeInTheDocument()
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('email')).toBeInTheDocument()
  })

  it('hides field rows when collapsed', () => {
    renderNode({
      container: { name: 'Customers', container_type: 'source', collapsed: true },
      fields: [{ id: 'e1', display_label: 'id', status: 'unmapped' }],
    })
    expect(screen.queryByText('id')).not.toBeInTheDocument()
  })
})
