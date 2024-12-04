import type { ColumnDef, ParameterDefinition } from '~/composables/core/types'

// Core table types
export interface TableState {
  columns: ColumnDef[]
  expandedRows: unknown[]
  sortField?: string
  sortOrder?: number
  filters?: Record<string, unknown>
}

// Table events
export interface ColumnUpdateEvent {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

export interface ColumnResizeEvent {
  element: HTMLElement
  delta: number
}

export interface ColumnReorderEvent {
  dragIndex: number
  dropIndex: number
  target: HTMLElement
}

// Re-export types for convenience
export type { ColumnDef }
export type { ParameterDefinition }

// Parameter grouping
export interface ParameterGroup {
  name: string
  parameters: ParameterDefinition[]
  color?: string
  description?: string
}
