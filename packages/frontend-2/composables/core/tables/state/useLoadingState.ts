import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export type LoadingPhase =
  | 'initial'
  | 'core_store'
  | 'store_initialization'
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
  const state: Ref<LoadingState> = ref({
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
    const rawParams = parameterStore.rawParameters.value
    const currentTable = tableStore.computed.currentTable.value

    // Basic presence checks
    const hasScheduleData = Array.isArray(scheduleData) && scheduleData.length > 0
    const hasTableData = Array.isArray(tableData) && tableData.length > 0
    const hasEvaluatedData = Array.isArray(evaluatedData) && evaluatedData.length > 0
    const hasParameters = Array.isArray(rawParams) && rawParams.length > 0

    // Data consistency checks
    const lengthsMatch =
      hasScheduleData &&
      hasTableData &&
      hasEvaluatedData &&
      scheduleData.length === tableData.length &&
      tableData.length === evaluatedData.length

    // Data integrity checks - only validate the data we have after filtering
    const dataIntegrity =
      scheduleData?.every((item, index) => {
        // Skip validation for filtered out elements
        if (!tableData?.[index] || !evaluatedData?.[index]) return true
        // Validate IDs match for elements that exist in all datasets
        return (
          item?.id === tableData[index]?.id && item?.id === evaluatedData[index]?.id
        )
      }) ?? true

    // Ensure we have some data to display
    const hasMinimumData =
      (scheduleData?.length ?? 0) > 0 &&
      (parameterStore.rawParameters.value?.length ?? 0) > 0

    const dataConsistent = dataIntegrity && hasMinimumData

    debug.log(DebugCategories.STATE, 'Data consistency check:', {
      dataIntegrity,
      hasMinimumData,
      counts: {
        scheduleData: scheduleData?.length ?? 0,
        tableData: tableData?.length ?? 0,
        evaluatedData: evaluatedData?.length ?? 0,
        parameters: parameterStore.rawParameters.value?.length ?? 0
      }
    })

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
      case 'store_initialization':
        return 'Initializing stores...'
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

  // Simple loading state - only based on phase
  const isLoading = computed(() => {
    const isInitializing = state.value.phase !== 'complete'

    // Log state for debugging
    debug.log(DebugCategories.STATE, 'Loading state', {
      phase: state.value.phase,
      version: state.value.version,
      isInitializing
    })

    return isInitializing
  })

  // Return type-safe composable
  // Return type-safe composable
  interface LoadingStateComposable {
    loadingMessage: ComputedRef<string>
    isLoading: ComputedRef<boolean>
    currentPhase: ComputedRef<LoadingPhase>
    transitionPhase: (phase: LoadingPhase, error?: Error | null) => void
    validateData: () => ValidationChecks
    state: Ref<LoadingState>
  }

  return {
    loadingMessage,
    isLoading,
    currentPhase: computed(() => state.value.phase),
    transitionPhase,
    validateData,
    state
  } as LoadingStateComposable
}
