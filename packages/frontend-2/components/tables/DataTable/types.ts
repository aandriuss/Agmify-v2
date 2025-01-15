import type { DataTableFilterMeta } from 'primevue/datatable'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { BaseTableRow } from '~/composables/core/types'

/**
 * Component state interface
 */
export interface ComponentState<T extends BaseTableRow = BaseTableRow> {
  columns: TableColumn[]
  detailColumns?: TableColumn[]
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
  columns: TableColumn[]
  detailColumns?: TableColumn[]
  loading?: boolean
  initialState?: {
    expandedRows?: T[]
    selectedRows?: T[]
  }
}

/**
 * Component state interface
 */
export interface ComponentState<T extends BaseTableRow = BaseTableRow> {
  columns: TableColumn[]
  detailColumns?: TableColumn[]
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
  columns: TableColumn[]
  detailColumns?: TableColumn[]
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
  columns: TableColumn[]
  detailColumns?: TableColumn[]
}

/**
 * Table wrapper props interface
 */
export interface TableWrapperProps<T extends BaseTableRow = BaseTableRow> {
  data: T[]
  columns: TableColumn[]
  detailColumns?: TableColumn[]
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
