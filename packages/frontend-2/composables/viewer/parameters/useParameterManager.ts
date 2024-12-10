import { ref, computed, type Ref } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import {
  createBimParameterWithDefaults,
  createUserParameterWithDefaults,
  isUserParameter,
  isBimParameter
} from '~/composables/core/types/parameters/parameter-types'
import type {
  Parameter,
  CreateParameterInput,
  BimParameter,
  UserParameter,
  BimValueType,
  UserValueType
} from '~/composables/core/types/parameters/'
import { useParameterDiscovery } from '~/composables/core/tables/state/useParameterDiscovery'
import type { DiscoveryProgressEvent } from '~/composables/core/types/parameters/discovery-types'

interface ParameterManagerOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  onError?: (error: Error) => void
}

interface ParameterManagerState {
  parameters: Parameter[]
  selectedParameters: Parameter[]
  error: Error | null
  isLoading: boolean
}

type BimParameterUpdate = Partial<Omit<BimParameter, 'kind'>> & { id: string }
type UserParameterUpdate = Partial<Omit<UserParameter, 'kind'>> & { id: string }
type ParameterUpdate = BimParameterUpdate | UserParameterUpdate

/**
 * Parameter manager composable
 * Handles parameter discovery, grouping, and management
 */
export function useParameterManager(options: ParameterManagerOptions) {
  // State
  const state = ref<ParameterManagerState>({
    parameters: [],
    selectedParameters: [],
    error: null,
    isLoading: false
  })

  // Initialize parameter discovery
  const discovery = useParameterDiscovery(
    {
      selectedParentCategories: options.selectedParentCategories,
      selectedChildCategories: options.selectedChildCategories,
      onError: handleError
    },
    {
      onStart: () => {
        state.value.isLoading = true
        debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery')
      },
      onComplete: (parameters) => {
        state.value.parameters = parameters
        debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
          parameterCount: parameters.length
        })
      },
      onError: handleError,
      onProgress: (progress) => {
        debug.log(DebugCategories.PARAMETERS, 'Parameter discovery progress', progress)
      }
    }
  )

  // Computed properties
  const parameterGroups = computed(() => {
    const groups = new Map<string, Parameter[]>()
    state.value.parameters.forEach((param) => {
      const group = isUserParameter(param) ? param.group : param.currentGroup
      if (!groups.has(group)) {
        groups.set(group, [])
      }
      groups.get(group)!.push(param)
    })
    return groups
  })

  const availableCategories = computed(() => {
    const categories = new Set<string>()
    state.value.parameters.forEach((param) => {
      if (param.category) {
        categories.add(param.category)
      }
    })
    return Array.from(categories)
  })

  const hasSelectedParameters = computed(
    () => state.value.selectedParameters.length > 0
  )
  const isLoading = computed(() => state.value.isLoading)
  const error = computed(() => state.value.error)

  // Progress tracking
  const discoveryProgress = computed<DiscoveryProgressEvent>(
    () => discovery.discoveryProgress.value
  )

  /**
   * Handle parameter selection
   */
  function selectParameter(parameter: Parameter) {
    try {
      state.value.selectedParameters = [parameter]
    } catch (err) {
      handleError(err)
    }
  }

  /**
   * Create a BIM parameter
   */
  function createBimParameter(input: CreateParameterInput): BimParameter {
    return createBimParameterWithDefaults({
      field: input.field,
      name: input.name,
      header: input.header,
      type: input.type as BimValueType,
      value: input.value,
      category: input.category,
      description: input.description,
      visible: input.visible,
      removable: input.removable,
      metadata: input.metadata,
      order: input.order,
      sourceValue: input.sourceValue ?? null,
      source: input.source,
      fetchedGroup: input.fetchedGroup || 'Default',
      currentGroup: input.currentGroup || input.fetchedGroup || 'Default'
    })
  }

  /**
   * Create a user parameter
   */
  function createUserParameter(input: CreateParameterInput): UserParameter {
    return createUserParameterWithDefaults({
      field: input.field,
      name: input.name,
      header: input.header,
      type: input.type as UserValueType,
      value: input.value,
      category: input.category,
      description: input.description,
      visible: input.visible,
      removable: input.removable,
      metadata: input.metadata,
      order: input.order,
      group: input.group || 'Custom',
      equation: input.equation,
      isCustom: input.isCustom,
      validationRules: input.validationRules
    })
  }

  /**
   * Handle parameter creation
   */
  async function createParameter(input: CreateParameterInput) {
    try {
      state.value.isLoading = true
      // Simulate async operation for now
      await new Promise((resolve) => setTimeout(resolve, 100))

      const newParameter =
        input.sourceValue !== undefined || input.fetchedGroup !== undefined
          ? createBimParameter(input)
          : createUserParameter(input)

      state.value.parameters.push(newParameter)
    } catch (err) {
      handleError(err)
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Update a BIM parameter
   */
  function updateBimParameter(
    current: BimParameter,
    update: BimParameterUpdate
  ): BimParameter {
    return {
      ...current,
      ...update,
      kind: 'bim' as const,
      type: update.type || current.type,
      sourceValue: update.sourceValue ?? current.sourceValue,
      fetchedGroup: update.fetchedGroup || current.fetchedGroup,
      currentGroup: update.currentGroup || current.currentGroup
    }
  }

  /**
   * Update a user parameter
   */
  function updateUserParameter(
    current: UserParameter,
    update: UserParameterUpdate
  ): UserParameter {
    return {
      ...current,
      ...update,
      kind: 'user' as const,
      type: update.type || current.type,
      group: update.group || current.group
    }
  }

  /**
   * Handle parameter updates
   */
  async function updateParameters(updates: ParameterUpdate[]) {
    try {
      state.value.isLoading = true
      // Simulate async operation for now
      await new Promise((resolve) => setTimeout(resolve, 100))

      updates.forEach((update) => {
        const index = state.value.parameters.findIndex((p) => p.id === update.id)
        if (index !== -1) {
          const current = state.value.parameters[index]
          if (isBimParameter(current)) {
            state.value.parameters[index] = updateBimParameter(
              current,
              update as BimParameterUpdate
            )
          } else {
            state.value.parameters[index] = updateUserParameter(
              current,
              update as UserParameterUpdate
            )
          }
        }
      })
    } catch (err) {
      handleError(err)
    } finally {
      state.value.isLoading = false
    }
  }

  /**
   * Error handling
   */
  function handleError(err: unknown) {
    const error = err instanceof Error ? err : new Error('Parameter operation failed')
    debug.error(DebugCategories.ERROR, 'Parameter manager error:', error)
    state.value.error = error
    options.onError?.(error)
  }

  /**
   * Reset state
   */
  function reset() {
    state.value = {
      parameters: [],
      selectedParameters: [],
      error: null,
      isLoading: false
    }
  }

  return {
    // State
    parameterGroups,
    availableCategories,
    selectedParameters: computed(() => state.value.selectedParameters),
    hasSelectedParameters,
    isLoading,
    error,
    discoveryProgress,

    // Methods
    selectParameter,
    createParameter,
    updateParameters,
    reset,

    // Discovery methods
    discoverParameters: discovery.discoverParameters,
    isDiscovering: discovery.isDiscovering,
    availableParentHeaders: discovery.availableParentHeaders,
    availableChildHeaders: discovery.availableChildHeaders
  }
}
