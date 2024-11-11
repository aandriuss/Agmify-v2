import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { TableUpdatePayload, TableConfig } from '../types'
import { debug } from '../utils/debug'

interface UseScheduleTableUpdatesOptions {
  settings: { value: { namedTables?: Record<string, TableConfig> } | null }
  currentTableId: { value: string }
  currentTable: { value: TableConfig | null }
  selectedTableId: { value: string }
  tableName: { value: string }
  selectedParentCategories: { value: string[] }
  selectedChildCategories: { value: string[] }
  currentTableColumns: { value: ColumnDef[] }
  currentDetailColumns: { value: ColumnDef[] }
  updateNamedTable: (id: string, config: TableConfig) => Promise<void>
  updateCategories: (parent: string[], child: string[]) => Promise<void>
  loadSettings: () => Promise<void>
  handleTableSelection: (id: string) => Promise<void>
  isInitialized?: Ref<boolean>
}

// Validation function for category state
function validateCategoryState(
  parentCategories: string[],
  childCategories: string[]
): boolean {
  if (!Array.isArray(parentCategories) || !Array.isArray(childCategories)) {
    debug.warn('Invalid category arrays:', {
      parent: parentCategories,
      child: childCategories
    })
    return false
  }

  return true
}

export function useScheduleTableUpdates(options: UseScheduleTableUpdatesOptions) {
  const {
    settings,
    currentTableId,
    currentTable,
    selectedTableId,
    tableName,
    selectedParentCategories,
    selectedChildCategories,
    currentTableColumns,
    currentDetailColumns,
    updateNamedTable,
    updateCategories,
    loadSettings,
    handleTableSelection,
    isInitialized
  } = options

  const tableKey = ref(Date.now().toString())
  const loadingError = ref<Error | null>(null)

  // Helper function to safely update categories
  async function updateCategoryState(
    parentCategories: string[],
    childCategories: string[]
  ) {
    debug.log('[TableUpdates] Updating category state:', {
      timestamp: new Date().toISOString(),
      parent: parentCategories,
      child: childCategories,
      isInitialized: isInitialized?.value
    })

    if (!validateCategoryState(parentCategories, childCategories)) {
      throw new Error('Invalid category state')
    }

    await updateCategories(parentCategories, childCategories)
  }

  async function handleBothColumnsUpdate(updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) {
    if (isInitialized?.value === false) {
      debug.warn('[TableUpdates] Skipping column update - not initialized')
      return
    }

    try {
      const { parentColumns, childColumns } = updates

      const currentTableConfig = settings.value?.namedTables?.[currentTableId.value]
      if (!currentTableConfig) {
        throw new Error('Current table configuration not found')
      }

      debug.log('[TableUpdates] Updating columns:', {
        timestamp: new Date().toISOString(),
        parentCount: parentColumns.length,
        childCount: childColumns.length,
        currentCategories: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })

      const updatedTableConfig: TableConfig = {
        ...currentTableConfig,
        parentColumns,
        childColumns,
        categoryFilters: {
          selectedParentCategories: selectedParentCategories.value,
          selectedChildCategories: selectedChildCategories.value
        },
        lastUpdateTimestamp: Date.now()
      }

      await updateNamedTable(currentTableId.value, updatedTableConfig)
      await updateCategoryState(
        selectedParentCategories.value,
        selectedChildCategories.value
      )
      tableKey.value = Date.now().toString()

      debug.log('[TableUpdates] Column update complete:', {
        timestamp: new Date().toISOString(),
        tableId: currentTableId.value,
        categories: updatedTableConfig.categoryFilters
      })
    } catch (err) {
      debug.error('[TableUpdates] Column update failed:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to update columns')
      throw loadingError.value
    }
  }

  async function handleParameterUpdate() {
    if (isInitialized?.value === false) {
      debug.warn('[TableUpdates] Skipping parameter update - not initialized')
      return
    }

    try {
      debug.log('[TableUpdates] Updating parameters')
      tableKey.value = Date.now().toString()
      await loadSettings()
      loadingError.value = null
    } catch (err) {
      debug.error('[TableUpdates] Parameter update failed:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to update parameters')
      throw loadingError.value
    }
  }

  async function handleTableUpdate(payload: TableUpdatePayload) {
    if (isInitialized?.value === false) {
      debug.warn('[TableUpdates] Skipping table update - not initialized')
      return
    }

    try {
      debug.log('[TableUpdates] Processing table update:', {
        timestamp: new Date().toISOString(),
        payload,
        currentState: {
          tableId: currentTable.value?.id,
          categories: {
            parent: selectedParentCategories.value,
            child: selectedChildCategories.value
          }
        }
      })

      if (currentTable.value?.id === payload.tableId) {
        tableName.value = payload.tableName
        selectedTableId.value = payload.tableId
        tableKey.value = Date.now().toString()

        await loadSettings()
        await handleTableSelection(payload.tableId)

        debug.log('[TableUpdates] Table update complete:', {
          timestamp: new Date().toISOString(),
          tableId: payload.tableId,
          newCategories: {
            parent: selectedParentCategories.value,
            child: selectedChildCategories.value
          }
        })
      }
    } catch (err) {
      debug.error('[TableUpdates] Table update failed:', err)
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to update table')
      throw loadingError.value
    }
  }

  async function saveTable() {
    if (!tableName.value || isInitialized?.value === false) {
      debug.warn('[TableUpdates] Skipping table save - not initialized or no name')
      return
    }

    try {
      debug.log('[TableUpdates] Saving table:', {
        timestamp: new Date().toISOString(),
        tableId: selectedTableId.value,
        name: tableName.value,
        categories: {
          parent: selectedParentCategories.value,
          child: selectedChildCategories.value
        }
      })

      if (selectedTableId.value) {
        const currentTableConfig = settings.value?.namedTables?.[selectedTableId.value]
        if (!currentTableConfig) {
          throw new Error('Table not found in current settings')
        }

        const updatedTableConfig: TableConfig = {
          ...currentTableConfig,
          name: tableName.value,
          parentColumns: currentTableColumns.value,
          childColumns: currentDetailColumns.value,
          categoryFilters: {
            selectedParentCategories: selectedParentCategories.value,
            selectedChildCategories: selectedChildCategories.value
          }
        }

        await updateNamedTable(selectedTableId.value, updatedTableConfig)
        debug.log('[TableUpdates] Table saved successfully:', {
          timestamp: new Date().toISOString(),
          tableId: selectedTableId.value,
          categories: updatedTableConfig.categoryFilters
        })
      }

      tableKey.value = Date.now().toString()
    } catch (error) {
      debug.error('[TableUpdates] Table save failed:', error)
      loadingError.value =
        error instanceof Error ? error : new Error('Failed to save table')
      throw loadingError.value
    }
  }

  // Debug watchers
  watch(
    () => tableKey.value,
    (newKey) => {
      if (isInitialized?.value === false) return

      debug.log('[TableUpdates] Table key changed:', {
        key: newKey,
        timestamp: new Date().toISOString()
      })
    }
  )

  watch(
    () => loadingError.value,
    (error) => {
      if (isInitialized?.value === false) return

      if (error) {
        debug.error('[TableUpdates] Loading error:', {
          error: error.message,
          timestamp: new Date().toISOString()
        })
      }
    }
  )

  return {
    tableKey,
    loadingError,
    handleBothColumnsUpdate,
    handleParameterUpdate,
    handleTableUpdate,
    saveTable
  }
}
