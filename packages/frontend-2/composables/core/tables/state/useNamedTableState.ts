import { ref, computed } from 'vue'
import type { TableColumn } from '~/composables/core/types'
import type { TableSettings } from '~/composables/core/types/tables'
import type {
  NamedTableState,
  NamedTableStateOptions
} from '~/composables/core/types/tables/state-types'
import { TableStateError } from '~/composables/core/types/errors'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useTableState } from './useTableState'

/**
 * Type guard for TableSettings
 */
function isNamedTableConfig(value: unknown): value is TableSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as TableSettings).id === 'string' &&
    'parentColumns' in value &&
    Array.isArray((value as TableSettings).parentColumns) &&
    'childColumns' in value &&
    Array.isArray((value as TableSettings).childColumns)
  )
}

/**
 * Named table state management
 * Extends core table state with named table functionality
 */
export function useNamedTableState({
  tableId,
  initialState = {},
  onError,
  onUpdate
}: NamedTableStateOptions): NamedTableState {
  // Initialize core table state
  const coreState = useTableState({
    tableId,
    initialColumns: initialState.parentColumns,
    onError,
    onUpdate
  })

  // Additional state for named tables
  const namedTables = ref<Record<string, TableSettings>>({})
  const activeTableId = ref<string | null>(null)
  const currentView = ref<'parent' | 'child'>('parent')
  const isDirty = ref(false)

  // Computed values
  const activeTable = computed(() => {
    const tableId = activeTableId.value
    if (!tableId) return null

    debug.log(DebugCategories.TABLE_DATA, 'Getting active table', { tableId })
    const table = namedTables.value[tableId]
    return isNamedTableConfig(table) ? table : null
  })

  const activeColumns = computed(() => {
    const table = activeTable.value
    if (!table) return []
    return currentView.value === 'parent' ? table.parentColumns : table.childColumns
  })

  // State management methods
  function setActiveTable(tableId: string) {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Setting active table', {
        tableId
      })

      const table = namedTables.value[tableId]
      if (!isNamedTableConfig(table)) {
        throw new TableStateError(`Table ${tableId} not found or invalid`)
      }

      activeTableId.value = tableId
      isDirty.value = false

      // Update core state columns
      coreState.updateColumns(
        currentView.value === 'parent' ? table.parentColumns : table.childColumns
      )

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Active table set')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to set active table:', err)
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to set active table')
    }
  }

  function toggleView() {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Toggling view')

      const table = activeTable.value
      if (!table) {
        throw new TableStateError('No active table')
      }

      currentView.value = currentView.value === 'parent' ? 'child' : 'parent'

      // Update core state columns
      coreState.updateColumns(
        currentView.value === 'parent' ? table.parentColumns : table.childColumns
      )

      debug.completeState(DebugCategories.TABLE_UPDATES, 'View toggled')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to toggle view:', err)
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to toggle view')
    }
  }

  function updateColumns(columns: TableColumn[]) {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating columns')

      const table = activeTable.value
      if (!table) {
        throw new TableStateError('No active table')
      }

      const reorderedColumns = columns.map((col, index) => ({
        ...col,
        order: index
      }))

      if (currentView.value === 'parent') {
        table.parentColumns = reorderedColumns
      } else {
        table.childColumns = reorderedColumns
      }

      // Update core state
      coreState.updateColumns(reorderedColumns)
      isDirty.value = true

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Columns updated')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update columns:', err)
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to update columns')
    }
  }

  function addTable(config: unknown) {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Adding table')

      if (!isNamedTableConfig(config)) {
        throw new TableStateError('Invalid table configuration')
      }

      namedTables.value[config.id] = config
      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table added')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to add table:', err)
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to add table')
    }
  }

  function removeTable(tableId: string) {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Removing table', {
        tableId
      })

      if (activeTableId.value === tableId) {
        activeTableId.value = null
        coreState.resetState()
      }

      const tables = { ...namedTables.value }
      delete tables[tableId]
      namedTables.value = tables

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table removed')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to remove table:', err)
      throw err instanceof Error
        ? new TableStateError(err.message, err)
        : new TableStateError('Failed to remove table')
    }
  }

  return {
    ...coreState,
    // Additional state
    namedTables,
    activeTableId,
    currentView,
    isDirty,
    activeTable,
    activeColumns,

    // Additional methods
    setActiveTable,
    toggleView,
    addTable,
    removeTable,

    // Override core method
    updateColumns
  }
}
