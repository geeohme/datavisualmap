'use client'
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import type { MappingConfidence } from '@/lib/domain/enums'

export function MappingEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected } = props
  const [path] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const confidence = (data as { confidence?: MappingConfidence } | undefined)?.confidence ?? 'draft'
  const stroke = confidence === 'confirmed' ? '#059669' : '#2563eb'
  const dash = confidence === 'confirmed' ? undefined : '6 4'
  return (
    <BaseEdge
      path={path}
      style={{
        stroke, strokeWidth: selected ? 3 : 2, strokeDasharray: dash,
      }}
    />
  )
}
