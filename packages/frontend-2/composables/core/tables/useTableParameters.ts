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

import { computed } from 'vue'
import { useTableStore } from './store/store'
import { useParameterStore } from '../parameters/store/store'
import { useStore } from '~/composables/core/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { ElementData, SelectedParameter } from '~/composables/core/types'

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
      // Initialize stores
      await parameterStore.init()

      // Load table if needed
      if (!currentTable.value && currentTableId.value) {
        await tableStore.loadTable(currentTableId.value)
      }

      // Ensure parameters are processed
      if (
        !parameterStore.parentRawParameters.value?.length &&
        !parameterStore.childRawParameters.value?.length
      ) {
        debug.warn(
          DebugCategories.PARAMETERS,
          'No parameters available, attempting to process'
        )
        const store = useStore()
        const elements = store.scheduleData.value || []
        if (elements?.length) {
          const validElements = elements.filter((el): el is ElementData => {
            return (
              el !== null && typeof el === 'object' && 'id' in el && 'parameters' in el
            )
          })
          if (validElements.length) {
            debug.log(DebugCategories.PARAMETERS, 'Processing elements', {
              total: elements.length,
              valid: validElements.length
            })
            await parameterStore.processParameters(validElements)
          } else {
            debug.warn(
              DebugCategories.PARAMETERS,
              'No valid elements found for parameter processing'
            )
          }
        }
      }

      // Wait for parameters to be processed
      if (forceInit || !parameterStore.state.value.initialized) {
        debug.log(DebugCategories.PARAMETERS, 'Waiting for parameter processing')
        await new Promise<void>((resolve) => {
          const unwatch = watch(
            () => parameterStore.state.value.processing.status,
            (status) => {
              if (status === 'complete') {
                unwatch()
                resolve()
              }
            },
            { immediate: true }
          )
        })
      }

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

      // Update table with processed parameters if needed
      if (
        parameterStore.parentRawParameters.value.length ||
        parameterStore.childRawParameters.value.length
      ) {
        const parentParams = parameterStore.parentSelectedParameters.value
        const childParams = parameterStore.childSelectedParameters.value

        if (parentParams.length || childParams.length) {
          await tableStore.updateSelectedParameters({
            parent: parentParams,
            child: childParams
          })
        }
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
          parentCount: parameterStore.parentSelectedParameters.value.length,
          childCount: parameterStore.childSelectedParameters.value.length
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
