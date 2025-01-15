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
import type {
  Store,
  ScheduleInitializationInstance,
  TableSettings,
  TableInfo
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

interface UseScheduleInitializationOptions {
  store: Store
}

export function useScheduleInitialization({ store }: UseScheduleInitializationOptions) {
  const initComponent = ref<ScheduleInitializationInstance>({
    init: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Initializing schedule component')
      await store.lifecycle.init()
    },

    update: async (state: Record<string, unknown>) => {
      try {
        // Type guard for state properties
        if (
          typeof state !== 'object' ||
          !state ||
          (state.id !== undefined && typeof state.id !== 'string') ||
          (state.name !== undefined && typeof state.name !== 'string') ||
          (state.config !== undefined && typeof state.config !== 'object')
        ) {
          throw new Error('Invalid state format')
        }

        const { id, name, config } = state as {
          id?: string
          name?: string
          config?: Partial<TableSettings>
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

        // Type guard for config properties
        if (
          config.parentColumns &&
          (!Array.isArray(config.parentColumns) ||
            !config.parentColumns.every(
              (col) => col && typeof col === 'object' && 'id' in col
            ))
        ) {
          throw new Error('Invalid parent columns format')
        }

        if (
          config.childColumns &&
          (!Array.isArray(config.childColumns) ||
            !config.childColumns.every(
              (col) => col && typeof col === 'object' && 'id' in col
            ))
        ) {
          throw new Error('Invalid child columns format')
        }

        if (
          config.categoryFilters &&
          (!Array.isArray(config.categoryFilters.selectedParentCategories) ||
            !Array.isArray(config.categoryFilters.selectedChildCategories))
        ) {
          throw new Error('Invalid category filters format')
        }

        // Handle new table creation
        if (!id) {
          try {
            // Update store state with type-safe arrays
            const parentColumns = config.parentColumns || []
            const childColumns = config.childColumns || []
            await store.setCurrentColumns(parentColumns, childColumns)

            await store.lifecycle.update({
              tableName: name || '',
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
            const currentTables = store.tablesArray.value || []
            await store.setTablesArray([...currentTables, newTableInfo])
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Failed to create new table', err)
            await store.lifecycle.update({
              error: err instanceof Error ? err : new Error(String(err))
            })
          }
          return
        }

        // Handle existing table update
        try {
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
              selectedParentCategories:
                config.categoryFilters.selectedParentCategories || [],
              selectedChildCategories:
                config.categoryFilters.selectedChildCategories || []
            })
          }

          // Update table info
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
          debug.error(DebugCategories.ERROR, 'Failed to update table', err)
          await store.lifecycle.update({
            error: err instanceof Error ? err : new Error(String(err))
          })
        }
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process table update', err)
        await store.lifecycle.update({
          error: err instanceof Error ? err : new Error(String(err))
        })
      }
    },

    cleanup: async () => {
      debug.log(DebugCategories.INITIALIZATION, 'Cleaning up schedule component')
      try {
        await store.lifecycle.cleanup()
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to cleanup schedule component', err)
      }
    }
  })

  // Return the raw instance instead of the ref
  return {
    initComponent: {
      init: initComponent.value.init,
      update: initComponent.value.update,
      cleanup: initComponent.value.cleanup,
      initialize: async () => {
        await initComponent.value.init()
      }
    }
  }
}
