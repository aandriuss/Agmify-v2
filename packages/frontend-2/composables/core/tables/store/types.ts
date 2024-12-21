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
 *    - Own table columns (using ColumnDef type)
 *    - Manage column visibility and order
 *
 * Does NOT handle:
 * - Raw parameters (managed by Parameter Store)
 * - Available parameters (managed by Parameter Store)
 * - UI state (managed by Core Store)
 */

import type { Ref } from 'vue'
import type { ColumnDef } from '~/composables/core/types/tables'
import type { SelectedParameter } from '~/composables/core/types/parameters/parameter-states'

/**
 * Category filters for table
 * Used to filter table rows by category
 */
export interface TableCategoryFilters {
  selectedChildCategories: string[]
  selectedParentCategories: string[]
}

/**
 * Selected parameters for table with parent/child separation
 * These are the parameters that have been selected from available parameters
 * and are used to create column definitions
 */
export interface TableSelectedParameters {
  parent: SelectedParameter[]
  child: SelectedParameter[]
}

/**
 * Table settings stored in PostgreSQL
 * This is the complete table configuration including:
 * - Column definitions (derived from selected parameters)
 * - Category filters
 * - Selected parameters
 */
export interface TableSettings {
  id: string
  name: string
  displayName: string
  childColumns: ColumnDef[]
  parentColumns: ColumnDef[]
  categoryFilters: TableCategoryFilters
  selectedParameters: TableSelectedParameters
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
  updateColumns(parentColumns: ColumnDef[], childColumns: ColumnDef[]): void

  // Store management
  reset(): void
}

/**
 * Table store options
 */
export interface TableStoreOptions {
  initialTables?: TableSettings[]
}
