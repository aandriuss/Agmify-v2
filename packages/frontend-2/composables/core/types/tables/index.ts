import type { Ref } from 'vue'
import type { Parameter } from '../parameters'

/**
 * Sort by field type
 */
export type SortByField = 'name' | 'category' | 'type' | 'fixed' | 'order'
export type SortDirection = 'asc' | 'desc'

/**
 * Sort by interface
 */
export interface SortBy {
  field: string
  direction: SortDirection
}

/**
 * Use columns options interface
 */
export interface UseColumnsOptions {
  initialColumns: ColumnDef[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<SortByField>
  selectedCategories?: Ref<string[]>
  onUpdate?: (columns: ColumnDef[]) => void
}

/**
 * Column definition for tables
 */
export interface ColumnDef {
  readonly id: string
  name: string
  field: string
  header: string
  type?: string
  source?: string
  category?: string
  visible: boolean
  order?: number
  width?: number
  sortable?: boolean
  filterable?: boolean
  metadata?: Record<string, unknown>
  headerComponent?: string
  fetchedGroup?: string
  currentGroup: string
  description?: string
  isFixed?: boolean
  isCustomParameter?: boolean
  parameterRef?: string
  color?: string
  expander?: boolean
  removable: boolean
}

/**
 * Category filters interface
 */
export interface CategoryFilters {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

/**
 * Base table configuration interface
 */
export interface TableConfig {
  readonly id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: CategoryFilters
  selectedParameterIds: string[]
  metadata?: Record<string, unknown>
  lastUpdateTimestamp: number
}

/**
 * Named table configuration interface
 */
export interface NamedTableConfig extends TableConfig {
  displayName: string
  description?: string
  userParameters?: Parameter[]
}

/**
 * Table state interface
 */
export interface TableState {
  selectedRows: Set<string>
  expandedRows: Set<string>
  sortBy?: {
    field: string
    direction: SortDirection
  }
  filters?: Record<string, unknown>
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
export interface TablesState {
  tables: Record<string, NamedTableConfig>
  loading: boolean
  error: Error | null
}

/**
 * Table settings interface
 */
export interface TableSettings {
  controlWidth: number
  namedTables: Record<string, NamedTableConfig>
  customParameters: Parameter[]
}
