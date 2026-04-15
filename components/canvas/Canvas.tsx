'use client'
import {
  ReactFlow, ReactFlowProvider, Background, Controls, MiniMap,
  type Node, type Edge, type Connection, type NodeChange, applyNodeChanges,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCallback, useMemo, useState, useEffect } from 'react'
import { toast } from 'sonner'
import { nodeTypes, edgeTypes } from './nodeTypes'
import { createClient } from '@/lib/supabase/browser'
import { updateContainerPosition } from '@/lib/db/containers'
import { createMapping, deleteMapping } from '@/lib/db/mappings'
import { useInvalidateProject, type ProjectData } from '@/lib/hooks/useProjectData'
import type { Project } from '@/lib/domain/types'
import type { Selection } from '@/components/project/Workspace'

function projectToGraph(
  data: ProjectData,
  projectId: string,
  selectedElementId: string | null,
  onSelectElement: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = data.containers.map(c => ({
    id: c.id,
    type: 'container',
    position: { x: c.position_x, y: c.position_y },
    data: {
      container: c,
      fields: data.elements
        .filter(e => e.container_id === c.id)
        .map(e => ({ id: e.id, display_label: e.display_label, status: e.status })),
      projectId,
      selectedElementId,
      onSelectElement,
    },
  }))
  const edges: Edge[] = data.mappings.flatMap(m =>
    m.source_element_ids.flatMap(sid =>
      m.target_element_ids.flatMap(tid => {
        const source = findContainerId(data, sid)
        const target = findContainerId(data, tid)
        if (!source || !target) return []
        return [{
          id: `${m.id}:${sid}->${tid}`,
          type: 'mapping',
          source,
          target,
          sourceHandle: `${sid}-s`,
          targetHandle: `${tid}-t`,
          data: { mappingId: m.id, confidence: m.confidence },
        }]
      }),
    ),
  )
  return { nodes, edges }
}

function findContainerId(data: ProjectData, elementId: string): string | null {
  return data.elements.find(e => e.id === elementId)?.container_id ?? null
}

export function Canvas({
  project, data, selection, onSelect,
}: {
  project: Project
  data: ProjectData
  selection: Selection
  onSelect: (s: Selection) => void
}) {
  const invalidate = useInvalidateProject()
  const selectedElementId = selection.kind === 'element' ? selection.id : null
  const handleSelectElement = useCallback(
    (id: string) => onSelect({ kind: 'element', id }),
    [onSelect],
  )
  const initial = useMemo(
    () => projectToGraph(data, project.id, selectedElementId, handleSelectElement),
    [data, project.id, selectedElementId, handleSelectElement],
  )
  const [nodes, setNodes] = useState<Node[]>(initial.nodes)
  const edges = initial.edges

  useEffect(() => {
    setNodes(projectToGraph(data, project.id, selectedElementId, handleSelectElement).nodes)
  }, [data, project.id, selectedElementId, handleSelectElement])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes(ns => applyNodeChanges(changes, ns))
  }, [])

  const onNodeDragStop = useCallback(async (_: unknown, node: Node) => {
    try {
      await updateContainerPosition(createClient(), node.id, node.position.x, node.position.y)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save position')
      invalidate(project.id)
    }
  }, [invalidate, project.id])

  const onConnect = useCallback(async (conn: Connection) => {
    const sid = conn.sourceHandle?.replace(/-s$/, '')
    const tid = conn.targetHandle?.replace(/-t$/, '')
    if (!sid || !tid) return
    try {
      await createMapping(createClient(), {
        project_id: project.id,
        source_element_ids: [sid],
        target_element_ids: [tid],
        mapping_type: 'passthrough',
        confidence: 'draft',
      })
      invalidate(project.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create mapping')
    }
  }, [invalidate, project.id])

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    const id = (edge.data as { mappingId: string } | undefined)?.mappingId
    if (id) onSelect({ kind: 'mapping', id })
  }, [onSelect])

  const onNodeClick = useCallback((_: unknown, _node: Node) => {
    // Field row clicks happen on the DOM inside the node; no-op at canvas level.
  }, [])

  const onEdgesDelete = useCallback(async (toDelete: Edge[]) => {
    const ids = new Set(
      toDelete.map(e => (e.data as { mappingId: string } | undefined)?.mappingId).filter(Boolean) as string[],
    )
    for (const id of ids) {
      try { await deleteMapping(createClient(), id) }
      catch (err) { toast.error(err instanceof Error ? err.message : 'Delete failed') }
    }
    invalidate(project.id)
  }, [invalidate, project.id])

  return (
    <div className="bg-neutral-100">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes.map(n => ({
            ...n,
            selected: selection.kind === 'element' && false, // element selection is tracked out-of-band
          }))}
          edges={edges.map(e => ({
            ...e,
            selected: selection.kind === 'mapping' &&
              (e.data as { mappingId: string }).mappingId === selection.id,
          }))}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          onConnect={onConnect}
          onEdgeClick={onEdgeClick}
          onNodeClick={onNodeClick}
          onEdgesDelete={onEdgesDelete}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  )
}
