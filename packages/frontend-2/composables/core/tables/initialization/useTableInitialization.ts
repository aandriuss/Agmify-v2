import { ref, computed } from 'vue'
import { debug, DebugCategories } from '../../utils/debug'
import type {
  TableInitializationState,
  TableInitializationInstance,
  TableInitializationOptions
} from '../../types/tables/initialization-types'
import type { Store } from '../../types'
import { defaultTableConfig, ensureRequiredColumns } from '../config/defaults'

const defaultState: TableInitializationState = {
  selectedTableId: defaultTableConfig.id,
  tableName: defaultTableConfig.name,
  currentTableColumns: defaultTableConfig.parentColumns,
  currentDetailColumns: defaultTableConfig.childColumns,
  selectedParentCategories: defaultTableConfig.categoryFilters.selectedParentCategories,
  selectedChildCategories: defaultTableConfig.categoryFilters.selectedChildCategories
}

export interface UseTableInitializationOptions extends TableInitializationOptions {
  store: Store
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

        // Initialize store if needed
        if (!store.initialized.value) {
          await store.lifecycle.init()
        }

        // Ensure required columns are present
        const config = ensureRequiredColumns({
          id: state.value.selectedTableId,
          name: state.value.tableName,
          displayName: state.value.tableName,
          parentColumns: state.value.currentTableColumns,
          childColumns: state.value.currentDetailColumns,
          categoryFilters: {
            selectedParentCategories: state.value.selectedParentCategories,
            selectedChildCategories: state.value.selectedChildCategories
          },
          userParameters: [],
          selectedParameterIds: [],
          lastUpdateTimestamp: Date.now()
        })

        // Update store with initial state
        await store.lifecycle.update({
          selectedTableId: config.id,
          tableName: config.name,
          currentTableColumns: config.parentColumns,
          currentDetailColumns: config.childColumns,
          selectedParentCategories: config.categoryFilters.selectedParentCategories,
          selectedChildCategories: config.categoryFilters.selectedChildCategories,
          userParameters: []
        })

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

        // Update store with reset state
        await store.lifecycle.update({
          selectedTableId: defaultTableConfig.id,
          tableName: defaultTableConfig.name,
          currentTableColumns: defaultTableConfig.parentColumns,
          currentDetailColumns: defaultTableConfig.childColumns,
          selectedParentCategories:
            defaultTableConfig.categoryFilters.selectedParentCategories,
          selectedChildCategories:
            defaultTableConfig.categoryFilters.selectedChildCategories,
          userParameters: []
        })

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
