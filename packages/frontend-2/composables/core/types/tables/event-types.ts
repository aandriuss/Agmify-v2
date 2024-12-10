import type { ColumnDef, BimColumnDef, UserColumnDef } from './column-types'
import type { BaseItem } from '../common/base-types'
import type { DataTableFilterMeta } from 'primevue/datatable'

/**
 * Base table event types
 */
export type TableEvents<TRow = unknown, TColumn extends BaseItem = BaseItem> = {
  'update:expanded-rows': [rows: TRow[]]
  'update:columns': [columns: TColumn[]]
  'update:detail-columns': [columns: TColumn[]]
  'update:both-columns': [
    updates: { parentColumns: TColumn[]; childColumns: TColumn[] }
  ]
  'column-reorder': [event: { dragIndex: number; dropIndex: number }]
  'column-resize': [event: { element: HTMLElement; delta: number }]
  'row-expand': [row: TRow]
  'row-collapse': [row: TRow]
  'table-updated': []
  'column-visibility-change': []
  sort: [field: string, order: number]
  filter: [filters: Record<string, DataTableFilterMeta>]
  error: [error: Error]
  retry: []
}

/**
 * BIM table event types
 */
export type BimTableEvents<TRow = unknown> = TableEvents<TRow, BimColumnDef> & {
  'create-parameter': []
  'edit-parameters': []
}

/**
 * User table event types
 */
export type UserTableEvents<TRow = unknown> = TableEvents<TRow, UserColumnDef> & {
  'create-parameter': []
  'edit-parameters': []
}

/**
 * Combined table event types
 */
export type CombinedTableEvents<TRow = unknown> = TableEvents<TRow, ColumnDef> & {
  'create-parameter': []
  'edit-parameters': []
  'category-update': [categories: string[]]
  'parameter-click': [row: TRow]
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
  initialState?: {
    expandedRows?: TRow[]
    selectedRows?: TRow[]
  }
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
export type EmitsToProps<T extends Record<string, unknown[]>> = {
  [K in keyof T]: (...args: T[K]) => void
}
