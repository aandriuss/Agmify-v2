import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { Parameter } from '~/composables/core/types'
import { useParametersState } from './useParametersState'
import {
  searchParameters,
  sortParameters,
  filterParametersByType,
  groupParametersByCategory,
  getUniqueCategories,
  getParameterTypes,
  generateParameterSummary
} from './useParameterUtils'

export type ParameterSortType = 'name' | 'category' | 'type' | 'fixed'

export interface UseParametersOptions {
  initialParameters?: Parameter[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<ParameterSortType>
  selectedCategories?: Ref<string[]>
  selectedTypes?: Ref<string[]>
  onError?: (error: string) => void
}

export class ParametersError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParametersError'
  }
}

/**
 * Core parameter management hook
 * Provides parameter filtering, sorting, and grouping functionality
 */
export function useParameters({
  searchTerm = ref(''),
  isGrouped = ref(true),
  sortBy = ref('category' as const),
  selectedCategories = ref([]),
  selectedTypes = ref([]),
  onError
}: UseParametersOptions = {}) {
  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new ParametersError(message)
  }

  try {
    debug.startState(DebugCategories.PARAMETERS, 'Initializing parameter management')

    // Get parameters from global state
    const { parameters: stateParameters } = useParametersState()

    // Convert state parameters object to array
    const parameters = computed(() => Object.values(stateParameters.value))

    // Base filtered parameters before grouping
    const filteredParameters = computed(() => {
      try {
        let result = [...parameters.value]

        // Apply category filter
        if (selectedCategories.value.length) {
          result = result.filter(
            (param) =>
              param.category && selectedCategories.value.includes(param.category)
          )
        }

        // Apply type filter
        if (selectedTypes.value.length) {
          result = filterParametersByType(result, selectedTypes.value)
        }

        // Apply search filter
        if (searchTerm.value) {
          result = searchParameters(result, searchTerm.value)
        }

        // Apply sorting
        return sortParameters(result, sortBy.value)
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to filter parameters:', err)
        handleError(err)
        return []
      }
    })

    // Grouped parameters
    const groupedParameters = computed(() => {
      try {
        if (!isGrouped.value) return []
        return groupParametersByCategory(filteredParameters.value)
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to group parameters:', err)
        handleError(err)
        return []
      }
    })

    // Statistics and metadata
    const stats = computed(() => {
      try {
        return generateParameterSummary(parameters.value)
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to generate parameter stats:', err)
        handleError(err)
        return {
          total: 0,
          bimCount: 0,
          userCount: 0,
          categories: [],
          types: []
        }
      }
    })

    function toggleCategory(category: string) {
      try {
        debug.startState(DebugCategories.PARAMETERS, 'Toggling category', { category })

        const current = [...selectedCategories.value]
        const index = current.indexOf(category)
        if (index === -1) {
          current.push(category)
        } else {
          current.splice(index, 1)
        }
        selectedCategories.value = current

        debug.completeState(DebugCategories.PARAMETERS, 'Category toggled')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to toggle category:', err)
        handleError(err)
      }
    }

    function toggleType(type: string) {
      try {
        debug.startState(DebugCategories.PARAMETERS, 'Toggling type', { type })

        const current = [...selectedTypes.value]
        const index = current.indexOf(type)
        if (index === -1) {
          current.push(type)
        } else {
          current.splice(index, 1)
        }
        selectedTypes.value = current

        debug.completeState(DebugCategories.PARAMETERS, 'Type toggled')
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to toggle type:', err)
        handleError(err)
      }
    }

    debug.completeState(DebugCategories.PARAMETERS, 'Parameter management initialized')

    return {
      // State
      parameters,
      filteredParameters,
      groupedParameters,
      stats,

      // Methods
      toggleCategory,
      toggleType,
      getUniqueCategories,
      getParameterTypes,

      // Refs for external control
      searchTerm,
      isGrouped,
      sortBy,
      selectedCategories,
      selectedTypes
    }
  } catch (err) {
    debug.error(
      DebugCategories.ERROR,
      'Failed to initialize parameter management:',
      err
    )
    handleError(err)
    throw err
  }
}
