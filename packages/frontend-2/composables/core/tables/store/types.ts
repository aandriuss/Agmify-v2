/**
 * Table Store Types
 *
 * Purpose:
 * 1. Table Management
 *    - Load/save tables from/to PostgreSQL
 *    - Manage current table state
 *
 * 2. Selected Parameters
 *    - Own selected parameters (both parent and child)
 *    - Manage parameter visibility and order
 *
 * 3. Column Management
 *    - Own table columns using TableColumn type
 *    - Manage column visibility and order
 *
 * Does NOT handle:
 * - Raw parameters (managed by Parameter Store)
 * - Available parameters (managed by Parameter Store)
 * - UI state (managed by Core Store)
 */

import type { Ref } from 'vue'
import type {
  BaseTableConfig,
  TableCategoryFilters,
  TableSelectedParameters,
  TableColumn
} from '~/composables/core/types'

/**
 * Sort configuration for tables
 */
export interface TableSort {
  field?: string
  order?: 'ASC' | 'DESC'
}

/**
 * Filter configuration for table columns
 */
export interface TableFilter {
  columnId: string
  value: string | number | boolean
  operator: string
}

/**
 * Table settings stored in PostgreSQL
 * Extends base config with display-specific properties
 */
export interface TableSettings extends BaseTableConfig {
  id: string
  name: string
  displayName: string
  childColumns: TableColumn[]
  parentColumns: TableColumn[]
  sort?: TableSort
  filters: TableFilter[]
  lastUpdateTimestamp: number
}

/**
 * Table store state
 * Internal state of the table store including:
 * - Map of all loaded tables
 * - Current table ID
 * - Loading/error state
 */
export interface TableStoreState {
  tables: Map<string, TableSettings>
  currentTableId: string | null
  loading: boolean
  error: Error | null
  lastUpdated: number
  currentView: 'parent' | 'child'
  isDirty: boolean
  isUpdating: boolean
  lastUpdateTime: number
  sort?: TableSort
  filters?: TableFilter[]
}

/**
 * Table store interface
 * Public API for interacting with table store:
 * - State access (tables, current table, loading state)
 * - Table operations (load, save, update, delete)
 * - Parameter management (update selected parameters)
 * - Column management (update column definitions)
 */
export interface TableStore {
  // State
  state: Ref<TableStoreState>
  currentTable: Ref<TableSettings | null>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  hasError: Ref<boolean>
  lastUpdated: Ref<number>
  currentView: Ref<'parent' | 'child'>
  isDirty: Ref<boolean>
  isUpdating: Ref<boolean>
  lastUpdateTime: Ref<number>
  sort: Ref<TableSort | undefined>
  filters: Ref<TableFilter[]>

  // Table operations
  loadTable(tableId: string): Promise<void>
  saveTable(settings: TableSettings): Promise<void>
  updateTable(updates: Partial<TableSettings>): void
  deleteTable(tableId: string): Promise<void>

  // Parameter management
  updateSelectedParameters(parameters: TableSelectedParameters): void

  // Category management
  updateCategoryFilters(filters: TableCategoryFilters): void

  // Column management
  updateColumns(parentColumns: TableColumn[], childColumns: TableColumn[]): void

  // Sort and filter operations
  updateSort(sort: TableSort | undefined): void
  updateFilters(filters: TableFilter[]): void

  // View management
  toggleView(): void

  // Store management
  initialize(): Promise<void>
  reset(): void
}

/**
 * Table store options
 */
export interface TableStoreOptions {
  initialTables?: TableSettings[]
}
