import type { ColumnDef, BimColumnDef, UserColumnDef } from './column-types'
import type { BaseItem } from '../common/base-types'
import type { DataTableFilterMeta } from 'primevue/datatable'
import type {
  ColumnUpdateEvent,
  ColumnReorderEvent,
  ColumnResizeEvent
} from '~/composables/core/types'

/**
 * Base table event types
 */
export interface TableEvents<TRow = unknown, TColumn extends BaseItem = BaseItem> {
  'update:expanded-rows': { rows: TRow[] }
  'update:columns': { columns: TColumn[] }
  'update:detail-columns': { columns: TColumn[] }
  'update:both-columns': ColumnUpdateEvent
  'column-reorder': ColumnReorderEvent
  'column-resize': ColumnResizeEvent
  'row-expand': { row: TRow }
  'row-collapse': { row: TRow }
  'table-updated': { timestamp: number }
  'column-visibility-change': { column: TColumn; visible: boolean }
  'update:is-test-mode': { value: boolean }
  sort: { field: string; order: number }
  filter: { filters: DataTableFilterMeta }
  error: { error: Error }
  retry: { timestamp: number }
}

/**
 * Parameter table event types
 */
export interface ParameterEvents<TRow = unknown, TColumn extends BaseItem = BaseItem>
  extends TableEvents<TRow, TColumn> {
  'create-parameter': { timestamp: number }
  'edit-parameters': { timestamp: number }
  'parameter-click': { parameter: TRow }
  'update:selected-categories': { categories: string[] }
}

/**
 * Schedule table event types
 */
export interface ScheduleEvents<TRow = unknown, TColumn extends BaseItem = BaseItem>
  extends ParameterEvents<TRow, TColumn> {
  'schedule-update': { schedule: TRow }
  'category-update': { categories: string[] }
  'parameter-group-update': { groups: Array<{ id: string; parameters: TRow[] }> }
}

/**
 * BIM table event types
 */
export type BimTableEvents<TRow = unknown> = TableEvents<TRow, BimColumnDef> & {
  'create-parameter': { timestamp: number }
  'edit-parameters': { timestamp: number }
}

/**
 * User table event types
 */
export type UserTableEvents<TRow = unknown> = TableEvents<TRow, UserColumnDef> & {
  'create-parameter': { timestamp: number }
  'edit-parameters': { timestamp: number }
}

/**
 * Combined table event types
 */
export type CombinedTableEvents<TRow = unknown> = TableEvents<TRow, ColumnDef> & {
  'create-parameter': { timestamp: number }
  'edit-parameters': { timestamp: number }
  'category-update': { categories: string[] }
  'parameter-click': { parameter: TRow }
}

/**
 * Base table props interface
 */
export interface BaseTableProps<TRow = unknown, TColumn extends BaseItem = BaseItem> {
  tableId: string
  tableName?: string
  data: TRow[]
  columns: TColumn[]
  detailColumns?: TColumn[]
  loading?: boolean
  error?: Error | null
  initialState?: TableState<TRow>
}

/**
 * Table state interface
 */
export interface TableState<TRow = unknown> {
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  expandedRows?: TRow[]
  selectedRows?: TRow[]
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

/**
 * BIM table props interface
 */
export interface BimTableProps<TRow = unknown>
  extends BaseTableProps<TRow, BimColumnDef> {
  canCreateParameters?: boolean
  parameterGroups?: { name: string; parameters: TRow[] }[]
}

/**
 * User table props interface
 */
export interface UserTableProps<TRow = unknown>
  extends BaseTableProps<TRow, UserColumnDef> {
  canCreateParameters?: boolean
  parameterGroups?: { name: string; parameters: TRow[] }[]
}

/**
 * Combined table props interface
 */
export interface CombinedTableProps<TRow = unknown>
  extends BaseTableProps<TRow, ColumnDef> {
  canCreateParameters?: boolean
  parameterGroups?: { name: string; parameters: TRow[] }[]
  availableCategories?: string[]
  selectedCategories?: string[]
}

/**
 * Vue emit type helper
 */
export type EmitsToProps<T extends Record<string, Record<string, unknown>>> = {
  [K in keyof T]: (payload: T[K]) => void
}
