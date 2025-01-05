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

import { computed, watch, ref } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from './store/store'
import { useParameterStore } from '../parameters/store/store'
import { useSelectedElementsData } from './state/useSelectedElementsData'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  SelectedParameter,
  ElementData,
  TableSettings
} from '~/composables/core/types'
import { isValidStoreState } from '~/composables/core/types/state'
import { defaultSelectedParameters } from '~/composables/core/tables/config/defaults'

interface TableSelectedParameters {
  parent: SelectedParameter[]
  child: SelectedParameter[]
}

/**
 * Composable to handle interaction between table and parameter stores
 */
export function useTableParameters() {
  const coreStore = useStore()
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()

  // Loading state
  const isInitializing = ref(false)
  const hasError = ref(false)
  const error = ref<Error | null>(null)

  // Static refs for initialization data with type guards
  const scheduleData = ref<ElementData[]>([])
  const selectedParentCategories = ref<string[]>([])
  const selectedChildCategories = ref<string[]>([])
  const currentTableId = ref<string | null>(null)
  const currentTable = ref<TableSettings | null>(null)
  const selectedParameters = ref<TableSelectedParameters>({
    parent: [],
    child: []
  })

  // Type guards
  function isValidTable(table: unknown): table is TableSettings {
    return (
      table !== null &&
      typeof table === 'object' &&
      'id' in table &&
      'selectedParameters' in table
    )
  }

  function isValidParameters(params: unknown): params is TableSelectedParameters {
    if (!params || typeof params !== 'object') return false

    const candidate = params as { parent?: unknown; child?: unknown }
    return (
      'parent' in candidate &&
      'child' in candidate &&
      Array.isArray(candidate.parent) &&
      Array.isArray(candidate.child)
    )
  }

  // Cache for processed data
  const processedData = ref<{
    elements: ElementData[]
    parameters: {
      parent: SelectedParameter[]
      child: SelectedParameter[]
    }
  }>({
    elements: [],
    parameters: {
      parent: [],
      child: []
    }
  })

  // Load initial data with type safety
  async function loadInitialData() {
    try {
      if (!isValidStoreState(coreStore.initialized)) {
        throw new Error('Store not initialized')
      }

      // Wait for store data to be ready
      await new Promise<void>((resolve) => {
        const unwatch = watch(
          [
            () => coreStore.scheduleData.value,
            () => coreStore.selectedParentCategories.value,
            () => coreStore.selectedChildCategories.value,
            () => tableStore.state.value.currentTableId,
            () => tableStore.currentTable.value
          ],
          ([storeData, parentCategories, childCategories, tableId, table]) => {
            // Load static data with type checks
            scheduleData.value = Array.isArray(storeData) ? storeData : []

            selectedParentCategories.value = Array.isArray(parentCategories)
              ? parentCategories
              : []

            selectedChildCategories.value = Array.isArray(childCategories)
              ? childCategories
              : []

            currentTableId.value = typeof tableId === 'string' ? tableId : null

            currentTable.value = isValidTable(table) ? table : null

            const params = currentTable.value?.selectedParameters
            selectedParameters.value = isValidParameters(params)
              ? params
              : {
                  parent: [],
                  child: []
                }

            // If we have any data, consider it ready
            if (
              scheduleData.value.length ||
              selectedParentCategories.value.length ||
              selectedChildCategories.value.length ||
              currentTableId.value ||
              currentTable.value
            ) {
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )

        // Timeout after 5 seconds
        setTimeout(() => {
          unwatch()
          resolve()
        }, 5000)
      })

      // Cache processed data with type safety
      processedData.value = {
        elements: scheduleData.value,
        parameters: selectedParameters.value
      }

      debug.log(DebugCategories.STATE, 'Initial data loaded', {
        scheduleData: scheduleData.value.length,
        parentCategories: selectedParentCategories.value.length,
        childCategories: selectedChildCategories.value.length,
        tableId: currentTableId.value,
        hasTable: !!currentTable.value,
        parameters: {
          parent: selectedParameters.value.parent.length,
          child: selectedParameters.value.child.length
        }
      })
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('Failed to load initial data')
      debug.error(DebugCategories.ERROR, 'Failed to load initial data:', error)
      throw error
    }
  }

  // Process elements without triggering updates
  const { processElements } = useSelectedElementsData({
    elements: computed(() => processedData.value.elements),
    selectedParentCategories: computed(() => selectedParentCategories.value),
    selectedChildCategories: computed(() => selectedChildCategories.value)
  })

  /**
   * Initialize parameters for current table
   */
  async function initializeTableParameters(forceInit = false) {
    // Load initial data first
    await loadInitialData()
    debug.startState(DebugCategories.PARAMETERS, 'Initializing table parameters', {
      tableId: currentTableId.value,
      table: currentTable.value,
      force: forceInit
    })

    isInitializing.value = true
    hasError.value = false
    error.value = null

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

      // Get selected parameters (default or existing)
      const selectedParams =
        !currentParams?.parent?.length && !currentParams?.child?.length
          ? defaultSelectedParameters
          : currentParams || defaultSelectedParameters

      // Update table with selected parameters
      await tableStore.updateSelectedParameters({
        parent: [...selectedParams.parent],
        child: [...selectedParams.child]
      } satisfies TableSelectedParameters)

      // Process elements with selected parameters
      await processElements()

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
      const errorObj = err instanceof Error ? err : new Error(String(err))
      debug.error(
        DebugCategories.PARAMETERS,
        'Failed to initialize table parameters:',
        errorObj
      )
      hasError.value = true
      error.value = errorObj
      throw errorObj
    } finally {
      isInitializing.value = false
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
      const errorObj = err instanceof Error ? err : new Error(String(err))
      debug.error(
        DebugCategories.PARAMETERS,
        'Failed to save parameter selection:',
        errorObj
      )
      throw errorObj
    }
  }

  return {
    // State
    currentTableId,
    currentTable,
    selectedParameters,
    isInitializing: computed(() => isInitializing.value),
    hasError: computed(() => hasError.value),
    error: computed(() => error.value),

    // Methods
    initializeTableParameters,
    saveParameterSelection
  }
}
