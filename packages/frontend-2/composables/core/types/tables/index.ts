import type { Ref } from 'vue'
import type { Parameter } from '../parameters'
import type {
  BaseColumnDef,
  BimColumnDef,
  UserColumnDef,
  ColumnDef
} from './column-types'
import type {
  TableEvents,
  BimTableEvents,
  UserTableEvents,
  CombinedTableEvents,
  BaseTableProps,
  BimTableProps,
  UserTableProps,
  CombinedTableProps
} from './event-types'

export type {
  // Column types
  BaseColumnDef,
  BimColumnDef,
  UserColumnDef,
  ColumnDef,
  // Event types
  TableEvents,
  BimTableEvents,
  UserTableEvents,
  CombinedTableEvents,
  // Props types
  BaseTableProps,
  BimTableProps,
  UserTableProps,
  CombinedTableProps
}

export type {
  TableStateOptions,
  CoreTableState,
  NamedTableStateOptions,
  NamedTableState,
  FilterDef,
  DataTableState,
  DataTableStateOptions
} from './state-types'

export {
  isBimColumnDef,
  isUserColumnDef,
  isColumnDef,
  createBaseColumnDef,
  createBimColumnDef,
  createUserColumnDef,
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  getColumnGroup
} from './column-types'

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

/**
 * DataTable event types from PrimeVue
 */
export interface DataTableColumnReorderEvent {
  originalEvent: Event
  dragIndex: number
  dropIndex: number
}

/**
 * DataTable column resize event
 */
export interface DataTableColumnResizeEvent {
  element: HTMLElement
  delta: number
}
