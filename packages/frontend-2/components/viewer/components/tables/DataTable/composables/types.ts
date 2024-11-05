// Core table types
export interface TableState {
  columns: ColumnDef[]
  expandedRows: any[]
  sortField?: string
  sortOrder?: number
  filters?: Record<string, any>
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

// Re-export from specific type files for convenience
export type { ColumnDef } from './columns/types'
export type {
  ParameterDefinition,
  ParameterGroup
} from '../../../parameters/composables/types'
