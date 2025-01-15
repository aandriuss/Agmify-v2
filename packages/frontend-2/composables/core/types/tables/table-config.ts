import type { Ref } from 'vue'
import type { TableColumn } from './table-column'

/**
 * Table category filters
 */
export interface TableCategoryFilters {
  selectedParentCategories: string[]
  selectedChildCategories: string[]
}

/**
 * Filter definition type
 */
export interface FilterDef {
  columnId: string
  value: string
  operator: string
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
  addTable: (config: BaseTableConfig) => void
  removeTable: (tableId: string) => void
}

/**
 * Sort configuration for tables
 */
export interface TableSort {
  field?: string
  order?: 'ASC' | 'DESC'
}

export type TableFilter = {
  __typename: 'string'
  columnId: string
  operator: string
  value: string
}

/**
 * Base table configuration interface
 * Matches GraphQL schema TableSettings type
 */
export interface BaseTableConfig {
  readonly id: string
  name: string
  displayName: string
  parentColumns: TableColumn[] // Full parameter data embedded in columns
  childColumns: TableColumn[] // Full parameter data embedded in columns
  categoryFilters: TableCategoryFilters
  filters: FilterDef[]
  sort?: TableSort
  metadata?: Record<string, unknown>
  lastUpdateTimestamp: number
}
