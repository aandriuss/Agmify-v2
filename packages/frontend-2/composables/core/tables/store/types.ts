/**
 * Table Store Types
 *
 * Purpose:
 * 1. Table Management
 *    - Load/save tables from/to PostgreSQL
 *    - Manage current table state
 *
 * 2. Column Management
 *    - Own table columns using TableColumn type
 *    - Manage column visibility and order
 *    - Handle parameter data within columns
 *
 * 3. UI State
 *    - Manage table-related UI state
 *    - Handle category visibility
 *
 * Does NOT handle:
 * - Raw parameters (managed by Parameter Store)
 * - Available parameters (managed by Parameter Store)
 * - General UI state (managed by Core Store)
 */

import type { Ref } from 'vue'
import type {
  BaseTableConfig,
  TableColumn,
  TableCategoryFilters,
  FilterDef,
  TableSort
} from '~/composables/core/types/'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'

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
  filters: FilterDef[]
  lastUpdateTimestamp: number
}

/**
 * Table UI state
 * Manages table-specific UI state
 */
export interface TableUIState {
  showCategoryOptions: boolean
}

/**
 * Table metadata for dropdown list
 * Lightweight version of table settings
 */
export interface TableMetadata {
  id: string
  name: string
  displayName: string
}

/**
 * Table store state
 * Internal state of the table store including:
 * - List of available tables (lightweight metadata)
 * - Current active table data
 * - Loading/error state
 * - UI state
 */
export interface TableStoreState {
  // Available tables for dropdown
  availableTables: TableMetadata[]

  // Active table data
  currentTableId: string | null
  currentTable: TableSettings | null // Working copy
  originalTable: TableSettings | null // Original state from PostgreSQL

  // State
  loading: boolean
  error: Error | null
  currentView: 'parent' | 'child'
  lastUpdated: number
  ui: TableUIState
}

/**
 * Computed state derived from comparing current table with original
 */
export interface TableComputedState {
  hasChanges: boolean // True if current table differs from original
  currentTable: TableSettings | null // Current working copy
}

/**
 * Table store interface
 * Public API for interacting with table store:
 * - State access (tables, current table, loading state)
 * - Table operations (load, save, update, delete)
 * - Column management (add, remove, update columns)
 * - UI state management
 */
export interface TableStore {
  // State
  state: Ref<TableStoreState>
  computed: {
    currentTable: Ref<TableSettings | null>
    hasChanges: Ref<boolean>
  }
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  hasError: Ref<boolean>
  currentView: Ref<'parent' | 'child'>
  lastUpdated: Ref<number>

  // Core operations
  loadTable(tableId: string): Promise<void> // Load full table data from PostgreSQL
  saveTable(settings: TableSettings): Promise<void> // Save to PostgreSQL
  updateTable(updates: Partial<TableSettings>): Promise<void> // Update working copy
  deleteTable(tableId: string): Promise<void>

  // Column operations
  addColumn(
    parameter: AvailableBimParameter | AvailableUserParameter,
    isParent: boolean
  ): Promise<void>
  removeColumn(columnId: string, isParent: boolean): Promise<void>
  updateColumns(
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ): Promise<void>

  // Category management
  updateCategories(categories: TableCategoryFilters): Promise<void>
  resetCategories(): Promise<void>

  // UI state management
  setShowCategoryOptions(show: boolean): void
  toggleCategoryOptions(): void

  // View management
  toggleView(): void

  // Store management
  initialize(): Promise<void>
  reset(): void
}

// Type guard for table columns
export function isTableColumn(value: unknown): value is TableColumn {
  if (!value || typeof value !== 'object') return false
  const col = value as { id?: unknown; field?: unknown; header?: unknown }
  return (
    typeof col.id === 'string' &&
    typeof col.field === 'string' &&
    typeof col.header === 'string'
  )
}

/**
 * Table store options
 */
export interface TableStoreOptions {
  initialTables?: TableSettings[]
}
