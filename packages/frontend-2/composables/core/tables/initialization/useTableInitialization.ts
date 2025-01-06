import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'
import type {
  TableInitializationState,
  TableInitializationInstance,
  TableInitializationOptions
} from '~/composables/core/types/tables/initialization-types'
import type { TableStore } from '../store/types'
import { defaultTableConfig } from '../config/defaults'

const defaultState: TableInitializationState = {
  selectedTableId: defaultTableConfig.id,
  tableName: defaultTableConfig.name,
  currentTableColumns: defaultTableConfig.parentColumns,
  currentDetailColumns: defaultTableConfig.childColumns,
  selectedParentCategories: defaultTableConfig.categoryFilters.selectedParentCategories,
  selectedChildCategories: defaultTableConfig.categoryFilters.selectedChildCategories
}

export interface UseTableInitializationOptions extends TableInitializationOptions {
  store: TableStore
}

/**
 * Core table initialization composable
 * Handles initialization and state management for tables
 */
export function useTableInitialization(options: UseTableInitializationOptions) {
  const { store, initialState, onUpdate, onError } = options

  // Initialize state with defaults and initial state
  const state = ref<TableInitializationState>({
    ...defaultState,
    ...initialState
  })

  // Create computed state for external consumers
  const computedState = computed(() => state.value)

  // Create initialization instance
  const instance: TableInitializationInstance = {
    state: computedState,
    initialize: async () => {
      try {
        debug.startState(DebugCategories.INITIALIZATION, 'Initializing table')

        // Get current table columns or use defaults
        const currentTable = store.currentTable.value
        const parentColumns =
          currentTable?.parentColumns || defaultTableConfig.parentColumns
        const childColumns =
          currentTable?.childColumns || defaultTableConfig.childColumns

        debug.log(DebugCategories.INITIALIZATION, 'Initializing table columns', {
          parent: parentColumns.length,
          child: childColumns.length,
          source: currentTable ? 'current' : 'default'
        })

        // Update columns first
        await store.updateColumns(parentColumns, childColumns)

        // Update other table settings
        await Promise.resolve(
          store.updateTable({
            id: state.value.selectedTableId,
            name: state.value.tableName,
            displayName: state.value.tableName,
            categoryFilters: {
              selectedParentCategories: state.value.selectedParentCategories,
              selectedChildCategories: state.value.selectedChildCategories
            }
          })
        )

        debug.completeState(DebugCategories.INITIALIZATION, 'Table initialized')
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error('Failed to initialize table')
        debug.error(DebugCategories.ERROR, 'Table initialization error:', error)
        onError?.(error)
        throw error
      }
    },

    reset: async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Resetting table state')

        // Reset state to defaults
        state.value = { ...defaultState }

        // Update columns with defaults
        await store.updateColumns(
          defaultTableConfig.parentColumns,
          defaultTableConfig.childColumns
        )

        // Update other table settings
        await Promise.resolve(
          store.updateTable({
            id: defaultTableConfig.id,
            name: defaultTableConfig.name,
            displayName: defaultTableConfig.name,
            categoryFilters: defaultTableConfig.categoryFilters
          })
        )

        debug.completeState(DebugCategories.STATE, 'Table state reset')
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to reset table')
        debug.error(DebugCategories.ERROR, 'Table reset error:', error)
        onError?.(error)
        throw error
      }
    },

    update: async (updates: Partial<TableInitializationState>) => {
      try {
        debug.startState(DebugCategories.STATE, 'Updating table state', updates)

        // Update local state
        state.value = {
          ...state.value,
          ...updates
        }

        // Notify parent of updates
        if (onUpdate) {
          await onUpdate(state.value)
        }

        debug.completeState(DebugCategories.STATE, 'Table state updated')
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to update table')
        debug.error(DebugCategories.ERROR, 'Table update error:', error)
        onError?.(error)
        throw error
      }
    }
  }

  // Return the instance directly, let consumers wrap in ref if needed
  return {
    initComponent: instance,
    state: computedState
  }
}
