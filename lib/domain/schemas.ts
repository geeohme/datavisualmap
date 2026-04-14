import { z } from 'zod'
import {
  CONTAINER_TYPES, ELEMENT_FIDELITIES, ELEMENT_STATUSES,
  MAPPING_TYPES, MAPPING_CONFIDENCES,
} from './enums'

export const ProjectInputSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
})

export const ContainerInputSchema = z.object({
  project_id: z.string().uuid().or(z.string().min(1)),
  name: z.string().min(1).max(200),
  container_type: z.enum(CONTAINER_TYPES),
  system_name: z.string().max(200).optional().nullable(),
  position_x: z.number().default(0),
  position_y: z.number().default(0),
})

export const DataElementInputSchema = z.object({
  container_id: z.string().min(1),
  display_label: z.string().min(1).max(200),
  db_column_name: z.string().max(200).optional().nullable(),
  ui_label: z.string().max(200).optional().nullable(),
  data_type: z.string().max(100).optional().nullable(),
  format: z.string().max(200).optional().nullable(),
  nullable: z.boolean().optional().nullable(),
  example_values: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  fidelity: z.enum(ELEMENT_FIDELITIES).default('label_only'),
  status: z.enum(ELEMENT_STATUSES).default('unmapped'),
  sort_order: z.number().int().default(0),
})

export const MappingInputSchema = z.object({
  project_id: z.string().min(1),
  source_element_ids: z.array(z.string()).min(1),
  target_element_ids: z.array(z.string()).min(1),
  mapping_type: z.enum(MAPPING_TYPES).default('passthrough'),
  transformation_note: z.string().optional().nullable(),
  confidence: z.enum(MAPPING_CONFIDENCES).default('draft'),
})
