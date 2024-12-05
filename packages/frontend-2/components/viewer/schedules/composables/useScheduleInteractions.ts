import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import type {
  ColumnDef,
  NamedTableConfig,
  ScheduleInitializationInstance
} from '~/composables/core/types'
import { useUserSettings } from '~/composables/useUserSettings'
import { useStore } from '../core/store'

interface ScheduleInteractionsState {
  selectedTableId: string
  tableName: string
  currentTable: NamedTableConfig | null
  selectedParentCategories: string[]
  selectedChildCategories: string[]
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
}

interface ScheduleInteractionsOptions {
  state: ScheduleInteractionsState
  initComponent: Ref<ScheduleInitializationInstance | null>
  updateCurrentColumns: (tableColumns: ColumnDef[], detailColumns: ColumnDef[]) => void
  handleError: (error: unknown) => void
  emit?: (event: 'close') => void
}

export function useScheduleInteractions(options: ScheduleInteractionsOptions) {
  const { updateCurrentColumns, handleError, emit } = options

  // Create a reactive state
  const state = ref<ScheduleInteractionsState>({
    ...options.state
  })

  // Initialize settings and store
  const { createNamedTable, updateTable, loadSettings, settings, selectTable } =
    useUserSettings()
  const store = useStore()

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
    if (emit) {
      emit('close')
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

  async function updateTablesArray() {
    if (!settings.value?.namedTables) return

    const tables = Object.entries(settings.value.namedTables).map(([_, table]) => ({
      id: table.id,
      name: table.name
    }))

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

      let savedTable: NamedTableConfig

      // Create new table or update existing one
      if (!state.value.selectedTableId) {
        debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table', {
          name: trimmedName
        })

        // Create new table with current settings
        const result = await createNamedTable(trimmedName, tableConfig)
        if (!result?.id || !result?.config) {
          throw new Error('Failed to create table')
        }
        savedTable = result.config
        savedTable.id = result.id
      } else {
        debug.log(DebugCategories.TABLE_UPDATES, 'Updating existing table', {
          id: state.value.selectedTableId,
          name: trimmedName
        })

        // Use selectedTableId directly as it's already the correct ID
        savedTable = await updateTable(state.value.selectedTableId, {
          ...tableConfig,
          id: state.value.selectedTableId
        })
      }

      // Update store with table data
      await store.lifecycle.update({
        selectedTableId: savedTable.id,
        currentTableId: savedTable.id,
        tableName: savedTable.name
      })

      // Update columns after save
      await updateCurrentColumns(savedTable.parentColumns, savedTable.childColumns)

      // Reload settings to get updated data
      await loadSettings()

      // Update tables array with new data
      await updateTablesArray()

      // Select the table
      selectTable(savedTable.id)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table save complete', {
        id: savedTable.id,
        name: savedTable.name,
        parentColumnsCount: savedTable.parentColumns.length,
        childColumnsCount: savedTable.childColumns.length
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save table')
      debug.error(DebugCategories.ERROR, 'Error saving table:', error)
      handleError(error)
      throw error // Re-throw to allow component to handle error
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
      throw error // Re-throw to allow component to handle error
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
    handleBothColumnsUpdate
  }
}
