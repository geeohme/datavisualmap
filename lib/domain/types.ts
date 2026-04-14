import { z } from 'zod'
import {
  ProjectInputSchema, ContainerInputSchema, DataElementInputSchema, MappingInputSchema,
} from './schemas'

export type ProjectInput = z.infer<typeof ProjectInputSchema>
export type ContainerInput = z.infer<typeof ContainerInputSchema>
export type DataElementInput = z.infer<typeof DataElementInputSchema>
export type MappingInput = z.infer<typeof MappingInputSchema>

export interface Project { id: string; name: string; description: string | null; created_by: string; created_at: string; updated_at: string }
export interface Container extends ContainerInput { id: string; collapsed: boolean; created_at: string; updated_at: string }
export interface DataElement extends DataElementInput { id: string; created_at: string; updated_at: string }
export interface Mapping extends MappingInput {
  id: string
  created_by: string | null; created_at: string
  confirmed_by: string | null; confirmed_at: string | null
}
