import { computed } from 'vue'
import type { Ref } from 'vue'
import type { ParameterDefinition, ParameterGroup } from '../composables/types'

interface UseParameterFilteringOptions {
  parameters: ParameterDefinition[]
  searchTerm: Ref<string>
  isGrouped: Ref<boolean>
  sortBy: Ref<'name' | 'category' | 'type' | 'fixed'>
}

export function useParameterFiltering({
  parameters,
  searchTerm,
  isGrouped,
  sortBy
}: UseParameterFilteringOptions) {
  const filteredParameters = computed(() => {
    let result = [...parameters]

    // Apply search filter
    if (searchTerm.value) {
      const normalizedSearch = searchTerm.value.toLowerCase().trim()
      result = result.filter(
        (param) =>
          param.header.toLowerCase().includes(normalizedSearch) ||
          param.field.toLowerCase().includes(normalizedSearch) ||
          param.category?.toLowerCase().includes(normalizedSearch) ||
          param.type?.toLowerCase().includes(normalizedSearch)
      )
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.header.localeCompare(b.header)
        case 'category':
          return (a.category || 'Other').localeCompare(b.category || 'Other')
        case 'type':
          return (a.type || '').localeCompare(b.type || '')
        case 'fixed':
          if (a.isFixed === b.isFixed) {
            return a.header.localeCompare(b.header)
          }
          return a.isFixed ? -1 : 1
        default:
          return 0
      }
    })

    return result
  })

  const groupedParameters = computed(() => {
    if (!isGrouped.value) return []

    const groups: Record<string, ParameterDefinition[]> = {}

    filteredParameters.value.forEach((param) => {
      const category = param.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(param)
    })

    return Object.entries(groups)
      .map(([category, parameters]) => ({
        category,
        parameters: parameters.sort((a, b) => a.header.localeCompare(b.header))
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  })

  return {
    filteredParameters,
    groupedParameters
  }
}
