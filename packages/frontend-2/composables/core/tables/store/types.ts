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
import type { BaseTableConfig, TableColumn } from '~/composables/core/types'

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
  originalTable: TableSettings | null // Original state from PostgreSQL
  loading: boolean
  error: Error | null
  currentView: 'parent' | 'child'
  lastUpdated: number
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
 * - Parameter management (update selected parameters)
 * - Column management (update column definitions)
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
  loadTable(tableId: string): Promise<void> // Load from PostgreSQL
  saveTable(settings: TableSettings): Promise<void> // Save to PostgreSQL
  updateTable(updates: Partial<TableSettings>): void // Update working copy
  deleteTable(tableId: string): Promise<void>
  updateColumns(
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ): Promise<void>

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
