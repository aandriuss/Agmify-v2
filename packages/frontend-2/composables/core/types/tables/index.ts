import type { ColumnDef, CategoryFilters } from '..'
import type { ParameterDefinition } from '../parameters'
import type { Ref } from 'vue'

/**
 * Sort by interface
 */
export interface SortBy {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Use columns options interface
 */
export interface UseColumnsOptions {
  initialColumns: ColumnDef[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<SortBy>
  selectedCategories?: Ref<string[]>
  onUpdate?: (columns: ColumnDef[]) => void
}

/**
 * Base table configuration interface
 */
export interface TableConfig {
  id: string
  name: string
  displayName: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

/**
 * Named table configuration interface
 */
export interface NamedTableConfig extends TableConfig {
  description?: string
}

/**
 * Table state interface
 */
export interface TableState {
  selectedRows: Set<string>
  expandedRows: Set<string>
  sortBy?: {
    field: string
    direction: 'asc' | 'desc'
  }
  filters?: Record<string, unknown>
}

/**
 * Table update payload interface
 */
export interface TableUpdatePayload {
  tableId: string
  tableName: string
  data?: unknown
}

/**
 * Create named table input interface
 */
export interface CreateNamedTableInput {
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
}

/**
 * Update named table input interface
 */
export interface UpdateNamedTableInput {
  id: string
  name?: string
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
  categoryFilters?: CategoryFilters
  selectedParameterIds?: string[]
}

/**
 * Table type settings interface
 */
export interface TableTypeSettings {
  type: 'viewer' | 'schedule' | 'custom'
  availableColumns: ParameterDefinition[]
  defaultColumns: ColumnDef[]
  categoryFilters?: CategoryFilters
}

/**
 * Table instance state interface
 */
export interface TableInstanceState {
  id: string
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
 * Table registry interface
 */
export interface TableRegistry {
  tables: Map<string, TableInstanceState>
  typeSettings: Map<string, TableTypeSettings>
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
  type: keyof TableUpdateOperationPayloads
  tableId: string
  targetView: 'parent' | 'child'
  payload: TableUpdateOperationPayloads[keyof TableUpdateOperationPayloads]
  timestamp: number
}

/**
 * Tables state interface
 */
export interface TablesState {
  tables: Record<string, NamedTableConfig>
  loading: boolean
  error: Error | null
}

/**
 * Tables query response
 */
export interface TablesQueryResponse {
  userTables: Record<string, NamedTableConfig>
}

/**
 * Tables mutation response
 */
export interface TablesMutationResponse {
  userTablesUpdate: boolean
}
