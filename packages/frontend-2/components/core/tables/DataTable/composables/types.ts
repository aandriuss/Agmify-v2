import type { TableColumn } from '~/composables/core/types'

// Core table types
export interface TableState {
  columns: TableColumn[]
  expandedRows: unknown[]
  sortField?: string
  sortOrder?: number
  filters?: Record<string, unknown>
}

// Table events
export interface ColumnUpdateEvent {
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
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
export type { TableColumn }
