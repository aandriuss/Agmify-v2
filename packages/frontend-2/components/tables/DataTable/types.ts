import type { DataTableFilterMeta } from 'primevue/datatable'
import type {
  BaseColumnDef,
  BimColumnDef,
  UserColumnDef,
  ColumnDef
} from '~/composables/core/types/tables/column-types'
import type { BaseItem } from '~/composables/core/types/common/base-types'

/**
 * Base table row interface
 */
export interface BaseTableRow extends BaseItem {
  [key: string]: unknown
}

/**
 * Table state interface
 */
export interface TableState<T extends BaseTableRow = BaseTableRow> {
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  expandedRows: T[]
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

/**
 * Table configuration interface
 */
export interface TableConfig {
  id: string
  name: string
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
}

/**
 * Event payloads
 */
export interface ColumnUpdateEvent {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

export interface ColumnReorderEvent {
  dragIndex: number
  dropIndex: number
}

export interface ColumnResizeEvent {
  element: HTMLElement
}

/**
 * Table events interface for Vue emits
 */
export interface TableEvents<T extends BaseTableRow = BaseTableRow> {
  (e: 'update:expandedRows', payload: { rows: T[] }): void
  (e: 'update:columns', payload: { columns: ColumnDef[] }): void
  (e: 'update:detail-columns', payload: { columns: ColumnDef[] }): void
  (e: 'update:both-columns', payload: ColumnUpdateEvent): void
  (e: 'column-reorder', payload: ColumnReorderEvent): void
  (e: 'column-resize', payload: ColumnResizeEvent): void
  (e: 'row-expand', payload: { row: T }): void
  (e: 'row-collapse', payload: { row: T }): void
  (e: 'table-updated', payload: { timestamp: number }): void
  (e: 'column-visibility-change', payload: { visible: boolean }): void
  (e: 'sort', payload: { field: string; order: number }): void
  (e: 'filter', payload: { filters: DataTableFilterMeta }): void
  (e: 'error', payload: { error: Error }): void
  (e: 'retry', payload: { timestamp: number }): void
  (e: string, ...args: unknown[]): void
}

/**
 * Table props interface
 */
export interface TableProps<T extends BaseTableRow = BaseTableRow> {
  tableId: string
  tableName?: string
  data: T[]
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  loading?: boolean
  initialState?: TableState<T>
}

/**
 * Column manager props interface
 */
export interface ColumnManagerProps {
  open: boolean
  tableId: string
  tableName: string
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
}

/**
 * Column manager events interface
 */
export interface ColumnManagerEvents {
  (e: 'update:open', payload: { value: boolean }): void
  (e: 'update:columns', payload: ColumnUpdateEvent): void
  (e: 'cancel', payload: { timestamp: number }): void
  (e: 'apply', payload: { timestamp: number }): void
  (e: string, ...args: unknown[]): void
}

/**
 * Table wrapper props interface
 */
export interface TableWrapperProps<T extends BaseTableRow = BaseTableRow> {
  data: T[]
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  expandedRows: T[]
  loading: boolean
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

/**
 * Type guards
 */
export function isBaseTableRow(value: unknown): value is BaseTableRow {
  if (!value || typeof value !== 'object') return false
  return 'id' in value && typeof (value as BaseTableRow).id === 'string'
}

// Re-export core type guards
export {
  isBimColumnDef,
  isUserColumnDef,
  isColumnDef
} from '~/composables/core/types/tables/column-types'

// Re-export core types for convenience
export type { BaseColumnDef, BimColumnDef, UserColumnDef, ColumnDef }
