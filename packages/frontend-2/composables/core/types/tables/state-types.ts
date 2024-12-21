import type { Ref } from 'vue'
import type { NamedTableConfig } from './index'
import type {
  BaseTableRow,
  CategoryFilters,
  ColumnDef,
  SelectedParameter
} from '~/composables/core/types'

/**
 * Filter definition type
 */
export interface FilterDef {
  value: unknown
  matchMode: string
}

/**
 * Base table state options
 */
export interface TableStateOptions {
  tableId: string
  initialColumns?: ColumnDef[]
  onError?: (error: Error) => void
  onUpdate?: () => void
}

/**
 * Core table state interface
 */
export interface CoreTableState {
  // State refs
  columns: Ref<ColumnDef[]>
  sortField: Ref<string | undefined>
  sortOrder: Ref<number | undefined>
  filters: Ref<Record<string, FilterDef> | undefined>
  error: Ref<Error | null>

  // Computed
  tableState: Ref<{
    columns: ColumnDef[]
    sortField?: string
    sortOrder?: number
    filters?: Record<string, FilterDef>
  }>

  // Methods
  updateColumns: (columns: ColumnDef[]) => void
  updateSort: (field: string | undefined, order: number | undefined) => void
  updateFilters: (filters: Record<string, FilterDef> | undefined) => void
  resetState: () => void
}

/**
 * Named table state options
 */
export interface NamedTableStateOptions extends TableStateOptions {
  initialState?: {
    parentColumns?: ColumnDef[]
    childColumns?: ColumnDef[]
  }
}

/**
 * Named table state interface
 */
export interface NamedTableState extends CoreTableState {
  // Additional state
  namedTables: Ref<Record<string, NamedTableConfig>>
  activeTableId: Ref<string | null>
  currentView: Ref<'parent' | 'child'>
  isDirty: Ref<boolean>

  // Additional computed
  activeTable: Ref<NamedTableConfig | null>
  activeColumns: Ref<ColumnDef[]>

  // Additional methods
  setActiveTable: (tableId: string) => void
  toggleView: () => void
  addTable: (config: unknown) => void
  removeTable: (tableId: string) => void
}

/**
 * DataTable state options
 */
export interface DataTableStateOptions extends TableStateOptions {
  initialState?: {
    expandedRows?: BaseTableRow[]
    detailColumns?: ColumnDef[]
  }
}

/**
 * DataTable state interface
 */
export interface DataTableState extends CoreTableState {
  // UI state
  isLoading: Ref<boolean>
  expandedRows: Ref<BaseTableRow[]>
  detailColumns: Ref<ColumnDef[]>

  // UI methods
  expandRow: (row: BaseTableRow) => void
  collapseRow: (row: BaseTableRow) => void
  updateDetailColumns: (columns: ColumnDef[]) => void
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
  selectedParameters: {
    parent: SelectedParameter[]
    child: SelectedParameter[]
  }
  metadata?: Record<string, unknown>
  lastUpdateTimestamp: number
}
