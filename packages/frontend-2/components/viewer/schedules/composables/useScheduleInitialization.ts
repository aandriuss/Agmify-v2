/**
 * Schedule Initialization Utilities
 *
 * This module handles the initialization and lifecycle of schedule components:
 * - Component initialization and cleanup
 * - State updates and synchronization
 * - Table configuration management
 *
 * The initialization process ensures proper setup of:
 * - Store state
 * - Table configurations
 * - Parameter selections
 * - Category filters
 */

import { ref } from 'vue'
import type { useStore } from '../core/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  TableConfig,
  ScheduleInitializationInstance,
  TableInfo
} from '~/composables/core/types'

interface UseScheduleInitializationOptions {
  store: ReturnType<typeof useStore>
}

export function useScheduleInitialization({ store }: UseScheduleInitializationOptions) {
  const initComponent = ref<ScheduleInitializationInstance>({
    init: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing schedule component')
      await store.lifecycle.init()
    },

    update: async (state: Record<string, unknown>) => {
      const { id, name, config } = state as {
        id?: string
        name?: string
        config?: Partial<TableConfig>
      }

      debug.log(DebugCategories.TABLE_UPDATES, 'Updating table state', {
        id,
        name,
        config
      })

      if (!config) {
        debug.warn(DebugCategories.TABLE_UPDATES, 'Invalid update state', state)
        return
      }

      // Handle new table creation
      if (!id) {
        // Update store state
        await store.setCurrentColumns(
          config.parentColumns || [],
          config.childColumns || []
        )
        await store.lifecycle.update({
          tableName: name,
          selectedParentCategories:
            config.categoryFilters?.selectedParentCategories || [],
          selectedChildCategories:
            config.categoryFilters?.selectedChildCategories || [],
          error: null
        })

        // Create new table info
        const newTableInfo: TableInfo = {
          id: store.currentTableId.value,
          name: name || ''
        }

        // Update tables array
        try {
          const currentTables = store.tablesArray.value || []
          await store.setTablesArray([...currentTables, newTableInfo])
        } catch (err) {
          debug.error(DebugCategories.ERROR, 'Failed to update tables array', err)
          await store.lifecycle.update({
            error: err instanceof Error ? err : new Error(String(err))
          })
        }
        return
      }

      // Handle existing table update
      await store.lifecycle.update({
        currentTableId: id,
        tableName: name
      })

      if (config.parentColumns || config.childColumns) {
        await store.setCurrentColumns(
          config.parentColumns || [],
          config.childColumns || []
        )
      }

      if (config.categoryFilters) {
        await store.lifecycle.update({
          selectedParentCategories: config.categoryFilters.selectedParentCategories,
          selectedChildCategories: config.categoryFilters.selectedChildCategories
        })
      }

      // Update table info
      try {
        const currentTables = store.tablesArray.value || []
        const updatedTables = currentTables.map((table) =>
          table.id === id
            ? {
                ...table,
                name: name || table.name
              }
            : table
        )
        await store.setTablesArray(updatedTables)
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update tables array', err)
        await store.lifecycle.update({
          error: err instanceof Error ? err : new Error(String(err))
        })
      }
    },

    cleanup: () => {
      debug.log(DebugCategories.INITIALIZATION, 'Cleaning up schedule component')
      // No cleanup needed currently
    }
  })

  return {
    initComponent
  }
}
