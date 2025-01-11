/**
 * Table Parameters Composable
 *
 * Purpose:
 * - Coordinates initialization and synchronization between parameter and table stores
 * - Handles loading of table parameters from PostgreSQL
 * - Manages parameter to column conversion
 *
 * Flow:
 * 1. Table loads from PostgreSQL with columns
 * 2. Parameter store processes raw parameters into available parameters
 * 3. Table store manages columns directly from available parameters
 */

import { computed, ref } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from './store/store'
import { useParameterStore } from '../parameters/store/store'
import { useSelectedElementsData } from './state/useSelectedElementsData'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

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

  // Load data directly from stores
  const scheduleData = computed(() => coreStore.scheduleData.value || [])
  const selectedParentCategories = computed(
    () => coreStore.selectedParentCategories.value || []
  )
  const selectedChildCategories = computed(
    () => coreStore.selectedChildCategories.value || []
  )
  const currentTableId = computed(() => tableStore.state.value.currentTableId)
  const currentTable = computed(() => tableStore.computed.currentTable.value)

  // Cache for processed data
  const processedData = computed(() => ({
    elements: scheduleData.value
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
   * Save current table state
   */
  async function saveTableState() {
    if (!currentTableId.value || !currentTable.value) {
      debug.error(
        DebugCategories.PARAMETERS,
        'Cannot save parameters: No table selected'
      )
      return
    }

    debug.startState(DebugCategories.PARAMETERS, 'Saving table state', {
      tableId: currentTableId.value,
      table: currentTable.value
    })

    try {
      // Save current table state
      if (currentTable.value) {
        await tableStore.saveTable(currentTable.value)
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Table state saved', {
        tableId: currentTableId.value
      })
    } catch (err) {
      const typedError = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.PARAMETERS, 'Failed to save table state:', typedError)
      throw typedError
    }
  }

  return {
    // State
    currentTableId,
    currentTable,
    isInitializing: computed(() => isInitializing.value),
    hasError: computed(() => hasError.value),
    error: computed(() => error.value),

    // Methods
    initializeTableParameters,
    saveTableState
  }
}
