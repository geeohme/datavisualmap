export const CONTAINER_TYPES = ['source','target','transformation','report','category'] as const
export type ContainerType = (typeof CONTAINER_TYPES)[number]

export const ELEMENT_FIDELITIES = ['full','partial','label_only'] as const
export type ElementFidelity = (typeof ELEMENT_FIDELITIES)[number]

export const ELEMENT_STATUSES = ['unmapped','mapped','not_needed','blocked','in_review','confirmed'] as const
export type ElementStatus = (typeof ELEMENT_STATUSES)[number]

export const MAPPING_TYPES = ['passthrough','concat','lookup','formula','derived','constant'] as const
export type MappingTypeEnum = (typeof MAPPING_TYPES)[number]

export const MAPPING_CONFIDENCES = ['draft','confirmed'] as const
export type MappingConfidence = (typeof MAPPING_CONFIDENCES)[number]
