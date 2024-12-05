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
  const { createNamedTable, updateNamedTable, loadSettings, settings, selectTable } =
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

    const tables = Object.entries(settings.value.namedTables).map(([id, table]) => ({
      id,
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
      const tableConfig = {
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

      let result

      // Create new table or update existing one
      if (!state.value.selectedTableId) {
        debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table', {
          name: trimmedName
        })

        // Initialize empty columns for new table
        await store.lifecycle.update({
          selectedTableId: '',
          currentTableId: '',
          tableName: trimmedName,
          parentVisibleColumns: [],
          childVisibleColumns: [],
          selectedParentCategories: [],
          selectedChildCategories: []
        })

        // Create new table
        result = await createNamedTable(trimmedName, tableConfig)
      } else {
        debug.log(DebugCategories.TABLE_UPDATES, 'Updating existing table', {
          id: state.value.selectedTableId,
          name: trimmedName
        })

        // Update existing table
        result = await updateNamedTable(state.value.selectedTableId, {
          ...tableConfig,
          id: state.value.selectedTableId
        })
      }

      if (!result?.id || !result?.config) {
        throw new Error('Failed to save table')
      }

      // Update store with table data
      await store.lifecycle.update({
        selectedTableId: result.id,
        currentTableId: result.id,
        tableName: result.config.name,
        parentVisibleColumns: result.config.parentColumns,
        childVisibleColumns: result.config.childColumns,
        selectedParentCategories:
          result.config.categoryFilters?.selectedParentCategories || [],
        selectedChildCategories:
          result.config.categoryFilters?.selectedChildCategories || []
      })

      // Update columns after save
      await updateCurrentColumns(
        result.config.parentColumns,
        result.config.childColumns
      )

      // Reload settings to get updated data
      await loadSettings()

      // Update tables array with new data
      await updateTablesArray()

      // Select the table
      selectTable(result.id)

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Table save complete', {
        id: result.id,
        name: result.config.name,
        parentColumnsCount: result.config.parentColumns.length,
        childColumnsCount: result.config.childColumns.length
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
      state.value = { ...newState }
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
