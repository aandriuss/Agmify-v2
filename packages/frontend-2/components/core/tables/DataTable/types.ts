import type { DataTableFilterMeta } from 'primevue/datatable'

/**
 * Base table row interface that can be extended for specific use cases
 */
export interface BaseTableRow {
  id: string
  [key: string]: unknown
}

/**
 * Column definition interface
 */
export interface TableColumnDef {
  id: string
  name: string
  field: string
  header: string
  type: string
  visible: boolean
  currentGroup: string
  removable: boolean // Now required
  width?: number
  order?: number
  category?: string
  description?: string
  parameterRef?: string
}

/**
 * Table state interface
 */
export interface TableState<T extends BaseTableRow = BaseTableRow> {
  columns: TableColumnDef[]
  detailColumns?: TableColumnDef[]
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
  columns: TableColumnDef[]
  detailColumns?: TableColumnDef[]
}

/**
 * Column update event interface
 */
export interface ColumnUpdateEvent {
  parentColumns: TableColumnDef[]
  childColumns: TableColumnDef[]
}

/**
 * Table events interface as a record type to satisfy ComponentEmits constraint
 */
export type TableEvents<T extends BaseTableRow = BaseTableRow> = Record<
  string,
  unknown[]
> & {
  'update:expandedRows': [rows: T[]]
  'update:columns': [columns: TableColumnDef[]]
  'update:detail-columns': [columns: TableColumnDef[]]
  'update:both-columns': [updates: ColumnUpdateEvent]
  'column-reorder': [event: { dragIndex: number; dropIndex: number }]
  'row-expand': [row: T]
  'row-collapse': [row: T]
  'table-updated': []
  'column-visibility-change': []
  sort: [field: string, order: number]
  filter: [filters: DataTableFilterMeta]
  error: [error: Error]
}

/**
 * Table props interface
 */
export interface TableProps<T extends BaseTableRow = BaseTableRow> {
  tableId: string
  tableName?: string
  data: T[]
  columns: TableColumnDef[]
  detailColumns?: TableColumnDef[]
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
  columns: TableColumnDef[]
  detailColumns?: TableColumnDef[]
}

/**
 * Column manager events interface
 */
export interface ColumnManagerEvents {
  'update:open': [value: boolean]
  'update:columns': [updates: ColumnUpdateEvent]
  cancel: []
  apply: []
}

/**
 * Table wrapper props interface
 */
export interface TableWrapperProps<T extends BaseTableRow = BaseTableRow> {
  data: T[]
  columns: TableColumnDef[]
  detailColumns?: TableColumnDef[]
  expandedRows: T[]
  loading: boolean
  sortField?: string
  sortOrder?: number
  filters?: DataTableFilterMeta
}

/**
 * Utility type guards
 */
export function isBaseTableRow(value: unknown): value is BaseTableRow {
  if (!value || typeof value !== 'object') return false
  return 'id' in value && typeof (value as BaseTableRow).id === 'string'
}

export function isTableColumnDef(value: unknown): value is TableColumnDef {
  if (!value || typeof value !== 'object') return false
  const candidate = value as TableColumnDef
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.field === 'string' &&
    typeof candidate.header === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.visible === 'boolean' &&
    typeof candidate.currentGroup === 'string' &&
    typeof candidate.removable === 'boolean'
  )
}
