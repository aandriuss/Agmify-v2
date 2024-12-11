import type { DataTableFilterMeta } from 'primevue/datatable'
import type { ColumnDef } from '~/composables/core/types/tables/column-types'
import type { BaseItem } from '~/composables/core/types/common/base-types'

/**
 * Base table row interface
 * Extends BaseItem to ensure consistent base properties
 */
export interface BaseTableRow extends BaseItem {
  [key: string]: unknown
}

/**
 * Component state interface
 */
export interface ComponentState<T extends BaseTableRow = BaseTableRow> {
  columns: ColumnDef[]
  detailColumns?: ColumnDef[]
  expandedRows: T[]
  selectedRows: T[]
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
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
  initialState?: {
    expandedRows?: T[]
    selectedRows?: T[]
  }
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
 * Type guard for base table row
 */
export function isBaseTableRow(value: unknown): value is BaseTableRow {
  if (!value || typeof value !== 'object') return false
  return 'id' in value && typeof (value as BaseTableRow).id === 'string'
}
