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

import { computed, ref } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from './store/store'
import { useParameterStore } from '../parameters/store/store'
import { useSelectedElementsData } from './state/useSelectedElementsData'
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
  const coreStore = useStore()
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()

  // Loading state
  const isInitializing = ref(false)
  const hasError = ref(false)
  const error = ref<Error | null>(null)

  // // Static refs for initialization data with type guards
  // const scheduleData = ref<ElementData[]>([])
  // const selectedParentCategories = ref<string[]>([])
  // const selectedChildCategories = ref<string[]>([])
  // const currentTableId = ref<string | null>(null)
  // const currentTable = ref<TableSettings | null>(null)
  // const selectedParameters = ref<TableSelectedParameters>({
  //   parent: [],
  //   child: []
  // })

  // // Type guards
  // function isValidTable(table: unknown): table is TableSettings {
  //   return (
  //     table !== null &&
  //     typeof table === 'object' &&
  //     'id' in table &&
  //     'selectedParameters' in table
  //   )
  // }

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

  // // Cache for processed data
  // const processedData = ref<{
  //   elements: ElementData[]
  //   parameters: {
  //     parent: SelectedParameter[]
  //     child: SelectedParameter[]
  //   }
  // }>({
  //   elements: [],
  //   parameters: {
  //     parent: [],
  //     child: []
  //   }
  // })

  // Load data directly from stores
  const scheduleData = computed(() => coreStore.scheduleData.value || [])
  const selectedParentCategories = computed(
    () => coreStore.selectedParentCategories.value || []
  )
  const selectedChildCategories = computed(
    () => coreStore.selectedChildCategories.value || []
  )
  const currentTableId = computed(() => tableStore.state.value.currentTableId)
  const currentTable = computed(() => tableStore.currentTable.value)
  const selectedParameters = computed(() => {
    const params = currentTable.value?.selectedParameters
    return isValidParameters(params) ? params : { parent: [], child: [] }
  })

  // Cache for processed data
  const processedData = computed(() => ({
    elements: scheduleData.value,
    parameters: selectedParameters.value
  }))

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
    debug.startState(DebugCategories.PARAMETERS, 'Initializing table parameters')
    isInitializing.value = true
    hasError.value = false
    error.value = null

    try {
      // Initialize parameter store if needed
      if (!parameterStore.state.value.initialized || forceInit) {
        await parameterStore.init()
      }

      // Load table if needed
      if (!currentTable.value && currentTableId.value) {
        await tableStore.loadTable(currentTableId.value)
      }

      // Use existing parameters or defaults
      const selectedParams =
        currentTable.value?.selectedParameters || defaultSelectedParameters
      await tableStore.updateSelectedParameters(selectedParams)

      // Process elements
      await processElements()

      debug.completeState(DebugCategories.PARAMETERS, 'Parameters initialized')
    } catch (err) {
      const typedError = err instanceof Error ? err : new Error(String(err))
      debug.error(
        DebugCategories.PARAMETERS,
        'Failed to initialize parameters:',
        typedError
      )
      hasError.value = true
      error.value = typedError
      throw typedError
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
      const typedError = err instanceof Error ? err : new Error(String(err))
      debug.error(
        DebugCategories.PARAMETERS,
        'Failed to save parameter selection:',
        typedError
      )
      throw typedError
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
