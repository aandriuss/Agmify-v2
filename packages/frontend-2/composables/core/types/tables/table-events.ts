import type { TableColumn } from './table-column'
import type { DataTableFilterMeta, DataTableFilterEvent } from 'primevue/datatable'

/**
 * Base table row interface
 */
export interface BaseTableRow {
  id: string
  [key: string]: unknown
}

/**
 * Table event payloads
 */
export interface ColumnVisibilityPayload {
  column: TableColumn
  visible: boolean
}

export interface ColumnReorderPayload {
  dragIndex: number
  dropIndex: number
}

export interface ColumnResizePayload {
  element: HTMLElement
  delta: number
}

export interface TableUpdatePayload {
  timestamp: number
}

export interface ErrorPayload {
  error: Error
}

// NEEDED OR NOT?
/**
 * Filter utilities
 */
export const filterUtils = {
  createFilterPayload(event: DataTableFilterEvent) {
    return {
      filters: event.filters
    }
  }
} as const

/**
 * Table events interface
 */
export interface TableEvents<TRow extends BaseTableRow = BaseTableRow> {
  'column-visibility-change': [payload: ColumnVisibilityPayload]
  'column-reorder': [payload: ColumnReorderPayload]
  'column-resize': [payload: ColumnResizePayload]
  'table-update': [payload: TableUpdatePayload]
  'row-expand': [payload: { row: TRow }]
  'row-collapse': [payload: { row: TRow }]
  error: [payload: ErrorPayload]
  retry: [payload: TableUpdatePayload]
  sort: [payload: { field: string; order: number }]
  filter: [payload: { filters: DataTableFilterMeta }]
}

/**
 * Vue emit type helper
 */
export type TableEmits<TRow extends BaseTableRow = BaseTableRow> = {
  (e: 'column-visibility-change', payload: ColumnVisibilityPayload): void
  (e: 'column-reorder', payload: ColumnReorderPayload): void
  (e: 'column-resize', payload: ColumnResizePayload): void
  (e: 'table-update', payload: TableUpdatePayload): void
  (e: 'row-expand', payload: { row: TRow }): void
  (e: 'row-collapse', payload: { row: TRow }): void
  (e: 'error', payload: ErrorPayload): void
  (e: 'retry', payload: TableUpdatePayload): void
  (e: 'sort', payload: { field: string; order: number }): void
  (e: 'filter', payload: { filters: DataTableFilterMeta }): void
}

/**
 * Schedule events interface
 */
export type ScheduleEmits<TRow extends BaseTableRow = BaseTableRow> =
  TableEmits<TRow> & {
    (
      e: 'parameter-visibility-change',
      payload: { parameter: { id: string; visible: boolean } }
    ): void
    (e: 'parameter-select', payload: { parameter: { id: string } }): void
    (e: 'parameter-deselect', payload: { parameter: { id: string } }): void
    (e: 'parameter-click', payload: { parameter: { id: string } }): void
    (e: 'create-parameter', payload: TableUpdatePayload): void
    (e: 'error', payload: ErrorPayload): void
  }

export interface ExpandableTableRow {
  id: string
  [key: string]: unknown
}
