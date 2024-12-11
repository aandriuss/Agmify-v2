import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  ColumnDef,
  NamedTableConfig,
  TableInitializationInstance,
  Store
} from '~/composables/core/types'

export interface TableInteractionsState {
  selectedTableId: string
  tableName: string
  currentTable: NamedTableConfig | null
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
}

export interface TableInteractionsOptions {
  store: Store
  state: TableInteractionsState
  initComponent: TableInitializationInstance
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  handleError: (error: unknown) => void
  onClose?: () => void
}

/**
 * Core table interactions composable
 * Handles table management, saving, and UI state
 */
export function useTableInteractions(options: TableInteractionsOptions) {
  const { store, updateCurrentColumns, handleError, onClose } = options

  // Create a reactive state
  const state = ref<TableInteractionsState>({
    ...options.state
  })

  // UI State
  const showCategoryOptions = ref(false)
  const showParameterManager = ref(false)

  // UI Toggles
  const toggleCategoryOptions = () => {
    showCategoryOptions.value = !showCategoryOptions.value
  }

  const toggleParameterManager = () => {
    showParameterManager.value = !showParameterManager.value
  }

  // Event Handlers
  const handleClose = () => {
    if (onClose) {
      onClose()
    }
  }

  function validateTableName(name: string | undefined): string {
    debug.log(DebugCategories.TABLE_UPDATES, 'Validating table name', { name })
    const trimmedName = name?.trim()
    if (!trimmedName) {
      debug.error(DebugCategories.ERROR, 'Table name validation failed: empty name')
      throw new Error('Table name is required')
    }
    return trimmedName
  }

  async function updateTablesArray(tables: { id: string; name: string }[]) {
    await store.lifecycle.update({ tablesArray: tables })
  }

  async function handleSaveTable() {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Save table requested', {
        state: state.value
      })

      // Validate table name
      const trimmedName = validateTableName(state.value.tableName)

      // Initialize empty arrays for new tables
      const currentTableColumns = state.value.currentTableColumns || []
      const currentDetailColumns = state.value.currentDetailColumns || []

      // Create table config
      const tableConfig: Partial<NamedTableConfig> = {
        name: trimmedName,
        displayName: trimmedName,
        parentColumns: currentTableColumns,
        childColumns: currentDetailColumns,
        categoryFilters: {
          selectedParentCategories: state.value.selectedParentCategories || [],
          selectedChildCategories: state.value.selectedChildCategories || []
        },
        selectedParameterIds: []
      }

      // Update store with table data
      await store.lifecycle.update({
        selectedTableId: state.value.selectedTableId,
        currentTableId: state.value.selectedTableId,
        tableName: trimmedName,
        currentTableColumns,
        currentDetailColumns,
        mergedTableColumns: currentTableColumns,
        mergedDetailColumns: currentDetailColumns
      })

      // Update columns
      await updateCurrentColumns(currentTableColumns, currentDetailColumns)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table save complete', {
        id: state.value.selectedTableId,
        name: trimmedName,
        parentColumnsCount: currentTableColumns.length,
        childColumnsCount: currentDetailColumns.length
      })

      return tableConfig
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save table')
      debug.error(DebugCategories.ERROR, 'Error saving table:', error)
      handleError(error)
      throw error
    }
  }

  async function handleBothColumnsUpdate(updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) {
    try {
      debug.log(DebugCategories.COLUMNS, 'Both columns update requested', updates)
      await updateCurrentColumns(updates.parentColumns, updates.childColumns)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update columns')
      handleError(error)
      throw error
    }
  }

  // Watch for state changes from parent
  watch(
    () => options.state,
    (newState) => {
      debug.log(DebugCategories.STATE, 'Updating interactions state', {
        oldName: state.value.tableName,
        newName: newState.tableName,
        state: newState
      })

      // If switching to create new table (selectedTableId is empty)
      // Keep current settings but update the name to "New table"
      if (!newState.selectedTableId && state.value.selectedTableId) {
        state.value = {
          ...newState,
          tableName: 'New Table'
        }
      } else {
        state.value = { ...newState }
      }
    },
    { deep: true, immediate: true }
  )

  return {
    // UI State
    showCategoryOptions,
    showParameterManager,
    state,

    // UI Toggles
    toggleCategoryOptions,
    toggleParameterManager,

    // Event Handlers
    handleClose,
    handleSaveTable,
    handleBothColumnsUpdate,
    updateTablesArray
  }
}
