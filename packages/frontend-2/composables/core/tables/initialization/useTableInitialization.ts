import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'
import type {
  TableInitializationState,
  TableInitializationInstance,
  TableInitializationOptions
} from '~/composables/core/types/tables/initialization-types'
import type { TableSettings, TableStore } from '../store/types'
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

        // Get selected parameters from current table if available, otherwise use defaults
        const existingParams =
          store.currentTable.value?.selectedParameters ||
          defaultTableConfig.selectedParameters

        debug.log(DebugCategories.INITIALIZATION, 'Parameters initialized', {
          parent: existingParams.parent.length,
          child: existingParams.child.length,
          note: 'Using default parameters until user customizes through Column Manager'
        })

        // Create table settings with current state
        const tableSettings: TableSettings = {
          id: state.value.selectedTableId,
          name: state.value.tableName,
          displayName: state.value.tableName,
          parentColumns: state.value.currentTableColumns,
          childColumns: state.value.currentDetailColumns,
          categoryFilters: {
            selectedParentCategories: state.value.selectedParentCategories,
            selectedChildCategories: state.value.selectedChildCategories
          },
          selectedParameters: existingParams,
          lastUpdateTimestamp: Date.now()
        }

        // Update store with initial state
        await Promise.resolve(store.updateTable(tableSettings))

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

        // Create default table settings
        const defaultSettings: TableSettings = {
          id: defaultTableConfig.id,
          name: defaultTableConfig.name,
          displayName: defaultTableConfig.name,
          parentColumns: defaultTableConfig.parentColumns,
          childColumns: defaultTableConfig.childColumns,
          categoryFilters: defaultTableConfig.categoryFilters,
          selectedParameters: defaultTableConfig.selectedParameters,
          lastUpdateTimestamp: Date.now()
        }

        // Update store with reset state
        await Promise.resolve(store.updateTable(defaultSettings))

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
