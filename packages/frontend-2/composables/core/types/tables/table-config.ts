import type { Ref } from 'vue'
import type { TableColumn } from './table-column'
import type { BaseTableRow } from '~/composables/core/types'
import type { SelectedParameter } from '../parameters/parameter-states'

/**
 * Table category filters
 */
export interface TableCategoryFilters {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

/**
 * Table selected parameters
 */
export interface TableSelectedParameters {
  parent: SelectedParameter[]
  child: SelectedParameter[]
}

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
  initialColumns?: TableColumn[]
  onError?: (error: Error) => void
  onUpdate?: () => void
}

/**
 * Core table state interface
 */
export interface CoreTableState {
  // State refs
  columns: Ref<TableColumn[]>
  sortField: Ref<string | undefined>
  sortOrder: Ref<number | undefined>
  filters: Ref<Record<string, FilterDef> | undefined>
  error: Ref<Error | null>

  // Computed
  tableState: Ref<{
    columns: TableColumn[]
    sortField?: string
    sortOrder?: number
    filters?: Record<string, FilterDef>
  }>

  // Methods
  updateColumns: (columns: TableColumn[]) => void
  updateSort: (field: string | undefined, order: number | undefined) => void
  updateFilters: (filters: Record<string, FilterDef> | undefined) => void
  resetState: () => void
}

/**
 * Named table state options
 */
export interface NamedTableStateOptions extends TableStateOptions {
  initialState?: {
    parentColumns?: TableColumn[]
    childColumns?: TableColumn[]
  }
}

/**
 * Named table state interface
 */
export interface NamedTableState extends CoreTableState {
  // Additional state
  namedTables: Ref<Record<string, BaseTableConfig>>
  activeTableId: Ref<string | null>
  currentView: Ref<'parent' | 'child'>
  isDirty: Ref<boolean>

  // Additional computed
  activeTable: Ref<BaseTableConfig | null>
  activeColumns: Ref<TableColumn[]>

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
    detailColumns?: TableColumn[]
  }
}

/**
 * DataTable state interface
 */
export interface DataTableState extends CoreTableState {
  // UI state
  isLoading: Ref<boolean>
  expandedRows: Ref<BaseTableRow[]>
  detailColumns: Ref<TableColumn[]>

  // UI methods
  expandRow: (row: BaseTableRow) => void
  collapseRow: (row: BaseTableRow) => void
  updateDetailColumns: (columns: TableColumn[]) => void
}

/**
 * Base table configuration interface
 */
export interface BaseTableConfig {
  readonly id: string
  name: string
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
  categoryFilters: TableCategoryFilters
  selectedParameters: TableSelectedParameters
  metadata?: Record<string, unknown>
  lastUpdateTimestamp: number
}
