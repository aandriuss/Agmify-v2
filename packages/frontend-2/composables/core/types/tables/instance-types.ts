import type {
  ColumnDef,
  NamedTableConfig,
  SortDirection,
  CategoryFilters
} from '~/composables/core/types'

/**
 * Table instance state interface
 */
export interface TableInstanceState {
  readonly id: string
  type: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
  version: number
  lastUpdated: number
}

/**
 * Table type settings interface
 */
export interface TableTypeSettings {
  type: 'viewer' | 'schedule' | 'custom'
  availableColumns: ColumnDef[]
  defaultColumns: ColumnDef[]
  categoryFilters?: CategoryFilters
}

/**
 * Table registry interface
 */
export interface TableRegistry {
  tables: Record<string, TableInstanceState>
  typeSettings: Record<string, TableTypeSettings>
}

/**
 * Table update operation payloads
 */
export interface TableUpdateOperationPayloads {
  ADD_COLUMN: {
    column: ColumnDef
  }
  REMOVE_COLUMN: {
    columnId: string
  }
  REORDER_COLUMN: {
    columnId: string
    newIndex: number
  }
  UPDATE_VISIBILITY: {
    columnId: string
    visible: boolean
  }
  UPDATE_FILTERS: {
    filters: CategoryFilters
  }
}

/**
 * Table update operation interface
 */
export interface TableUpdateOperation {
  readonly type: keyof TableUpdateOperationPayloads
  readonly tableId: string
  readonly targetView: 'parent' | 'child'
  readonly payload: TableUpdateOperationPayloads[keyof TableUpdateOperationPayloads]
  readonly timestamp: number
}

/**
 * Tables state interface
 */
export interface TablesUIState {
  tables: Record<string, NamedTableConfig>
  loading: boolean
  error: Error | null
}

/**
 * Table UI state interface
 */
export interface TableUIState {
  selectedRows: Set<string>
  expandedRows: Set<string>
  sortBy?: {
    field: string
    direction: SortDirection
  }
  filters?: Record<string, unknown>
}
