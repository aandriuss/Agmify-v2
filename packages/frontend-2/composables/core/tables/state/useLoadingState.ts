import { computed } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export type LoadingPhase =
  | 'initial'
  | 'core_store'
  | 'parameter_store'
  | 'table_store'
  | 'world_tree'
  | 'bim_elements'
  | 'data_sync'
  | 'complete'
  | 'error'

interface LoadingState {
  phase: LoadingPhase
  error: Error | null
  version: number
}

export function useLoadingState() {
  const store = useStore()
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()

  // Track loading phase
  const state = ref<LoadingState>({
    phase: 'initial',
    error: null,
    version: 0
  })

  interface ValidationChecks {
    // Data validation
    hasScheduleData: boolean
    hasTableData: boolean
    hasEvaluatedData: boolean
    hasParameters: boolean
    lengthsMatch: boolean
    dataIntegrity: boolean
    dataConsistent: boolean
    // Store states
    storesInitialized: boolean
    dataInitialized: boolean
    // Processing states
    isProcessing: boolean
    isLoading: boolean
  }

  // Validate data consistency
  const validateData = (): ValidationChecks => {
    const scheduleData = store.scheduleData.value
    const tableData = store.tableData.value
    const evaluatedData = store.evaluatedData.value
    const parentParams = parameterStore.parentRawParameters.value
    const childParams = parameterStore.childRawParameters.value
    const currentTable = tableStore.currentTable.value

    // Basic presence checks
    const hasScheduleData = Array.isArray(scheduleData) && scheduleData.length > 0
    const hasTableData = Array.isArray(tableData) && tableData.length > 0
    const hasEvaluatedData = Array.isArray(evaluatedData) && evaluatedData.length > 0
    const hasParameters =
      (Array.isArray(parentParams) && parentParams.length > 0) ||
      (Array.isArray(childParams) && childParams.length > 0)

    // Data consistency checks
    const lengthsMatch =
      hasScheduleData &&
      hasTableData &&
      hasEvaluatedData &&
      scheduleData.length === tableData.length &&
      tableData.length === evaluatedData.length

    // Data integrity checks
    const dataIntegrity =
      lengthsMatch &&
      scheduleData.every((item, index) => {
        if (!item?.id) return false
        const tableItem = tableData[index]
        const evalItem = evaluatedData[index]
        return tableItem?.id === item.id && evalItem?.id === item.id
      })

    const dataConsistent = lengthsMatch && dataIntegrity

    // Store initialization checks
    const storesInitialized =
      store.state.value.initialized &&
      parameterStore.state.value.initialized &&
      currentTable !== null

    const dataInitialized = hasScheduleData || hasParameters

    return {
      hasScheduleData,
      hasTableData,
      hasEvaluatedData,
      hasParameters,
      lengthsMatch,
      dataIntegrity,
      dataConsistent,
      storesInitialized,
      dataInitialized,
      isProcessing: parameterStore.state.value.processing.status === 'processing',
      isLoading: store.state.value.loading
    }
  }

  // Phase transition logic
  const transitionPhase = (newPhase: LoadingPhase, error: Error | null = null) => {
    state.value = {
      phase: newPhase,
      error,
      version: state.value.version + 1
    }
  }

  // Loading message based on current phase
  const loadingMessage = computed(() => {
    switch (state.value.phase) {
      case 'initial':
        return 'Initializing...'
      case 'core_store':
        return 'Initializing core store...'
      case 'parameter_store':
        return 'Initializing parameter store...'
      case 'table_store':
        return 'Initializing table store...'
      case 'world_tree':
        return 'Loading world tree...'
      case 'bim_elements':
        return 'Loading BIM elements...'
      case 'data_sync':
        return 'Synchronizing data...'
      case 'complete':
        return ''
      case 'error':
        return state.value.error?.message || 'An error occurred'
      default:
        return 'Loading...'
    }
  })

  // Loading state based on phase and validation
  const isLoading = computed(() => {
    const validation = validateData()

    // Log state for debugging
    debug.log(DebugCategories.STATE, 'Loading state', {
      phase: state.value.phase,
      version: state.value.version,
      validation
    })

    return (
      state.value.phase !== 'complete' ||
      validation.isProcessing ||
      validation.isLoading ||
      !validation.dataConsistent
    )
  })

  return {
    loadingMessage,
    isLoading,
    currentPhase: computed(() => state.value.phase),
    transitionPhase,
    validateData
  }
}
