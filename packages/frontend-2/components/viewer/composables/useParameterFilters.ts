import { ref, computed } from 'vue'
import type { ParameterDefinition } from './parameterUtilities'
import { parameterUtils } from './parameterUtilities'

export function useParameterFilters(
  parameters: ParameterDefinition[] | undefined = []
) {
  // Filter state
  const searchTerm = ref('')
  const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')
  const isGrouped = ref(true)
  const selectedCategories = ref<string[]>([])
  const selectedTypes = ref<string[]>([])

  // Computed properties
  const filteredParameters = computed(() => {
    let result = parameters || []

    // Apply search
    if (searchTerm.value) {
      result = parameterUtils.search(result, searchTerm.value)
    }

    // Apply category filters
    if (selectedCategories.value.length) {
      result = result.filter(
        (param) => param.category && selectedCategories.value.includes(param.category)
      )
    }

    // Apply type filters
    if (selectedTypes.value.length) {
      result = parameterUtils.filterByType(result, selectedTypes.value)
    }

    // Apply sorting
    result = parameterUtils.sort(result, sortBy.value)

    return result
  })

  const groupedParameters = computed(() => {
    return parameterUtils.groupByCategory(filteredParameters.value)
  })

  const availableCategories = computed(() => {
    return parameterUtils.getCategories(parameters || [])
  })

  const availableTypes = computed(() => {
    return parameterUtils.getTypes(parameters || [])
  })

  const hasFilters = computed(() => {
    return Boolean(
      searchTerm.value ||
        sortBy.value !== 'category' ||
        !isGrouped.value ||
        selectedCategories.value.length ||
        selectedTypes.value.length
    )
  })

  // Actions
  const clearFilters = () => {
    searchTerm.value = ''
    sortBy.value = 'category'
    isGrouped.value = true
    selectedCategories.value = []
    selectedTypes.value = []
  }

  return {
    // State
    searchTerm,
    sortBy,
    isGrouped,
    selectedCategories,
    selectedTypes,

    // Computed
    filteredParameters,
    groupedParameters,
    availableCategories,
    availableTypes,
    hasFilters,

    // Actions
    clearFilters
  }
}
