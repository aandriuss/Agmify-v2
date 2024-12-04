import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import type {
  ColumnDef,
  TableConfig,
  ScheduleInitializationInstance,
  UserSettings
} from '~/composables/core/types'
import { useUserSettings } from '~/composables/useUserSettings'
import { useStore } from '../core/store'

interface ScheduleInteractionsState {
  selectedTableId: string
  tableName: string
  currentTable: TableConfig | null
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
  const { createNamedTable, updateNamedTable, loadSettings, settings } =
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

  async function updateTablesArray(settings: UserSettings) {
    if (!settings.namedTables) return

    const tables = Object.entries(settings.namedTables).map(([id, table]) => ({
      id,
      name: table.name
    }))

    await store.lifecycle.update({
      tablesArray: tables
    })
  }

  async function handleSaveTable() {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Save table requested', {
        state: state.value
      })

      // Validate table name
      const trimmedName = validateTableName(state.value.tableName)

      // Create config with all current state
      const baseConfig = {
        parentColumns: state.value.currentTableColumns,
        childColumns: state.value.currentDetailColumns,
        categoryFilters: {
          selectedParentCategories: state.value.selectedParentCategories,
          selectedChildCategories: state.value.selectedChildCategories
        },
        customParameters: state.value.currentTable?.customParameters || []
      }

      let result: TableConfig | null = null

      // Create new table or update existing one
      if (!state.value.selectedTableId) {
        debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table', {
          name: trimmedName,
          config: baseConfig
        })

        // Create new table in settings
        result = await createNamedTable(trimmedName, baseConfig)

        // Update store with new table ID
        await store.lifecycle.update({
          selectedTableId: result.id,
          currentTableId: result.id,
          tableName: result.name
        })
      } else {
        debug.log(DebugCategories.TABLE_UPDATES, 'Updating existing table', {
          id: state.value.selectedTableId,
          name: trimmedName,
          config: baseConfig
        })

        // Update existing table in settings
        result = await updateNamedTable(state.value.selectedTableId, {
          ...baseConfig,
          name: trimmedName
        })

        // Ensure store IDs are in sync
        await store.lifecycle.update({
          selectedTableId: state.value.selectedTableId,
          currentTableId: state.value.selectedTableId,
          tableName: result.name
        })
      }

      if (!result) {
        throw new Error('Failed to save table')
      }

      // Update columns after save
      await updateCurrentColumns(result.parentColumns, result.childColumns)

      // Update store with latest state
      await store.lifecycle.update({
        parentBaseColumns: result.parentColumns,
        childBaseColumns: result.childColumns,
        parentVisibleColumns: result.parentColumns,
        childVisibleColumns: result.childColumns,
        selectedParentCategories:
          result.categoryFilters?.selectedParentCategories || [],
        selectedChildCategories: result.categoryFilters?.selectedChildCategories || [],
        customParameters: result.customParameters || []
      })

      // Reload settings to get updated data
      await loadSettings()

      // Update tables array with new data
      if (settings.value) {
        await updateTablesArray(settings.value)
      }

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Save table completed', {
        id: result.id,
        name: result.name,
        parentColumnsCount: result.parentColumns.length,
        childColumnsCount: result.childColumns.length,
        customParametersCount: result.customParameters?.length || 0
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
