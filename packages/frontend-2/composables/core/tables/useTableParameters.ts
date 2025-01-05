/**
 * Table Parameters Composable
 *
 * Purpose:
 * - Coordinates initialization and synchronization between parameter and table stores
 * - Handles loading of table parameters from PostgreSQL
 * - Manages parameter selection persistence
 *
 * Flow:
 * 1. Table loads from PostgreSQL with selected parameters
 * 2. Parameter store processes raw parameters into available parameters
 * 3. Table store manages selected parameters and columns
 */

import { computed, watch } from 'vue'
import { useTableStore } from './store/store'
import { useParameterStore } from '../parameters/store/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { SelectedParameter } from '~/composables/core/types'
import { defaultSelectedParameters } from '~/composables/core/tables/config/defaults'

interface TableSelectedParameters {
  parent: SelectedParameter[]
  child: SelectedParameter[]
}

/**
 * Composable to handle interaction between table and parameter stores
 */
export function useTableParameters() {
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()

  // Computed
  const currentTableId = computed(() => tableStore.state.value.currentTableId)
  const currentTable = computed(() => tableStore.currentTable.value)
  const selectedParameters = computed<TableSelectedParameters>(
    () =>
      currentTable.value?.selectedParameters || {
        parent: [],
        child: []
      }
  )

  /**
   * Initialize parameters for current table
   */
  async function initializeTableParameters(forceInit = false) {
    debug.startState(DebugCategories.PARAMETERS, 'Initializing table parameters', {
      tableId: currentTableId.value,
      table: currentTable.value,
      force: forceInit
    })

    try {
      debug.startState(DebugCategories.PARAMETERS, 'Initializing table parameters')

      // Initialize stores
      await parameterStore.init()

      // Load table if needed
      if (!currentTable.value && currentTableId.value) {
        await tableStore.loadTable(currentTableId.value)
      }

      // Verify parameters are available
      const paramCounts = {
        parentRaw: parameterStore.parentRawParameters.value?.length || 0,
        childRaw: parameterStore.childRawParameters.value?.length || 0,
        parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
        childBim: parameterStore.childAvailableBimParameters.value?.length || 0
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameter availability check', paramCounts)

      if (paramCounts.parentBim === 0 && paramCounts.childBim === 0) {
        debug.warn(DebugCategories.PARAMETERS, 'No parameters available')
        throw new Error('No parameters available for table initialization')
      }

      // Wait for parameter store initialization
      if (forceInit || !parameterStore.state.value.initialized) {
        debug.log(
          DebugCategories.PARAMETERS,
          'Waiting for parameter store initialization'
        )
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Parameter store initialization timeout'))
          }, 10000)

          const unwatch = watch(
            () => parameterStore.state.value.initialized,
            (initialized) => {
              if (initialized) {
                clearTimeout(timeout)
                unwatch()
                resolve()
              }
            },
            { immediate: true }
          )
        })
      }

      // Verify parameters were processed
      if (
        !parameterStore.parentRawParameters.value?.length &&
        !parameterStore.childRawParameters.value?.length
      ) {
        throw new Error('No parameters available after processing')
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
        raw: {
          parent: parameterStore.parentRawParameters.value.length,
          child: parameterStore.childRawParameters.value.length
        },
        available: {
          parentBim: parameterStore.parentAvailableBimParameters.value.length,
          parentUser: parameterStore.parentAvailableUserParameters.value.length,
          childBim: parameterStore.childAvailableBimParameters.value.length,
          childUser: parameterStore.childAvailableUserParameters.value.length
        }
      })

      // Log current state
      debug.log(DebugCategories.PARAMETERS, 'Current parameter state', {
        rawParameters: {
          parent: parameterStore.parentRawParameters.value.length,
          child: parameterStore.childRawParameters.value.length
        },
        selectedParameters: {
          parent: selectedParameters.value.parent.length,
          child: selectedParameters.value.child.length
        }
      })

      // Get current selected parameters
      const currentParams = currentTable.value?.selectedParameters

      // If no parameters or empty arrays, use default selected parameters
      if (!currentParams?.parent?.length && !currentParams?.child?.length) {
        debug.log(DebugCategories.PARAMETERS, 'No parameters selected, using defaults')

        debug.log(DebugCategories.PARAMETERS, 'Default parameters selected', {
          parent: defaultSelectedParameters.parent.length,
          child: defaultSelectedParameters.child.length,
          sample: defaultSelectedParameters.parent[0]
            ? {
                id: defaultSelectedParameters.parent[0].id,
                kind: defaultSelectedParameters.parent[0].kind,
                type: defaultSelectedParameters.parent[0].type,
                group: defaultSelectedParameters.parent[0].group,
                order: defaultSelectedParameters.parent[0].order
              }
            : null
        })

        await tableStore.updateSelectedParameters({
          parent: [...defaultSelectedParameters.parent],
          child: [...defaultSelectedParameters.child]
        } satisfies TableSelectedParameters)
      } else if (currentParams) {
        // Update with existing selected parameters
        await tableStore.updateSelectedParameters({
          parent: currentParams.parent,
          child: currentParams.child
        } satisfies TableSelectedParameters)
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameters initialized', {
        parent: selectedParameters.value.parent.length,
        child: selectedParameters.value.child.length
      })

      debug.completeState(DebugCategories.PARAMETERS, 'Table parameters initialized', {
        tableId: currentTableId.value,
        table: currentTable.value,
        selectedParameters: {
          parentCount: selectedParameters.value.parent.length,
          childCount: selectedParameters.value.child.length
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(
        DebugCategories.PARAMETERS,
        'Failed to initialize table parameters:',
        error
      )
      throw error
    }
  }

  /**
   * Save current parameter selection to table
   */
  async function saveParameterSelection() {
    if (!currentTableId.value || !currentTable.value) {
      debug.error(
        DebugCategories.PARAMETERS,
        'Cannot save parameters: No table selected'
      )
      return
    }

    debug.startState(DebugCategories.PARAMETERS, 'Saving parameter selection', {
      tableId: currentTableId.value,
      table: currentTable.value
    })

    try {
      // Save current table state
      if (currentTable.value) {
        await tableStore.saveTable(currentTable.value)
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter selection saved', {
        tableId: currentTableId.value,
        selectedParameters: {
          parentCount: currentTable.value?.selectedParameters?.parent.length || 0,
          childCount: currentTable.value?.selectedParameters?.child.length || 0
        }
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(
        DebugCategories.PARAMETERS,
        'Failed to save parameter selection:',
        error
      )
      throw error
    }
  }

  return {
    // State
    currentTableId,
    currentTable,
    selectedParameters,

    // Methods
    initializeTableParameters,
    saveParameterSelection
  }
}
