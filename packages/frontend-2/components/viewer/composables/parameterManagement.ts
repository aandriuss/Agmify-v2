import { ref, computed } from 'vue'

import type { ParameterGroup } from './parameterUtilities'

export interface ParameterDefinition {
  field: string
  header: string
  type?: string
  description?: string
  category?: string
  isFixed?: boolean
}

export interface FixedParameterGroup {
  category: string
  parameters: ParameterDefinition[]
}

export const fixedParentParameters: FixedParameterGroup[] = [
  {
    category: 'Walls',
    parameters: [
      {
        field: 'category',
        header: 'Category',
        type: 'string',
        category: 'classification',
        isFixed: true
      },
      {
        field: 'id',
        header: 'ID',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'mark',
        header: 'Mark',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'type',
        header: 'Type',
        type: 'string',
        category: 'classification',
        isFixed: true
      },
      {
        field: 'baseConstraint',
        header: 'Base Constraint',
        type: 'string',
        category: 'constraints',
        isFixed: true
      },
      {
        field: 'topConstraint',
        header: 'Top Constraint',
        type: 'string',
        category: 'constraints',
        isFixed: true
      },
      {
        field: 'length',
        header: 'Length',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      },
      {
        field: 'height',
        header: 'Height',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      }
    ]
  },
  {
    category: 'Floors',
    parameters: [
      {
        field: 'id',
        header: 'ID',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'mark',
        header: 'Mark',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'type',
        header: 'Type',
        type: 'string',
        category: 'classification',
        isFixed: true
      },
      {
        field: 'level',
        header: 'Level',
        type: 'string',
        category: 'location',
        isFixed: true
      },
      {
        field: 'thickness',
        header: 'Thickness',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      },
      {
        field: 'area',
        header: 'Area',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      }
    ]
  }
]

export const fixedChildParameters: FixedParameterGroup[] = [
  {
    category: 'Walls',
    parameters: [
      {
        field: 'category',
        header: 'Category',
        type: 'string',
        category: 'classification',
        isFixed: true
      },
      {
        field: 'id',
        header: 'ID',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'mark',
        header: 'Mark',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'type',
        header: 'Type',
        type: 'string',
        category: 'classification',
        isFixed: true
      },
      {
        field: 'baseConstraint',
        header: 'Base Constraint',
        type: 'string',
        category: 'constraints',
        isFixed: true
      },
      {
        field: 'topConstraint',
        header: 'Top Constraint',
        type: 'string',
        category: 'constraints',
        isFixed: true
      },
      {
        field: 'length',
        header: 'Length',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      },
      {
        field: 'height',
        header: 'Height',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      }
    ]
  },
  {
    category: 'Floors',
    parameters: [
      {
        field: 'id',
        header: 'ID',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'mark',
        header: 'Mark',
        type: 'string',
        category: 'identification',
        isFixed: true
      },
      {
        field: 'type',
        header: 'Type',
        type: 'string',
        category: 'classification',
        isFixed: true
      },
      {
        field: 'level',
        header: 'Level',
        type: 'string',
        category: 'location',
        isFixed: true
      },
      {
        field: 'thickness',
        header: 'Thickness',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      },
      {
        field: 'area',
        header: 'Area',
        type: 'number',
        category: 'dimensions',
        isFixed: true
      }
    ]
  }
]

export function searchParameters(
  parameters: ParameterDefinition[],
  searchTerm: string
): ParameterDefinition[] {
  const normalizedSearch = searchTerm.toLowerCase().trim()
  if (!normalizedSearch) return parameters

  return parameters.filter(
    (param) =>
      param.header.toLowerCase().includes(normalizedSearch) ||
      param.field.toLowerCase().includes(normalizedSearch) ||
      param.category?.toLowerCase().includes(normalizedSearch) ||
      param.type?.toLowerCase().includes(normalizedSearch)
  )
}

export function filterByCategories(
  parameters: ParameterDefinition[],
  categories: string[]
): ParameterDefinition[] {
  if (!categories.length) return parameters
  return parameters.filter(
    (param) => param.category && categories.includes(param.category)
  )
}

export function filterByTypes(
  parameters: ParameterDefinition[],
  types: string[]
): ParameterDefinition[] {
  if (!types.length) return parameters
  return parameters.filter((param) => param.type && types.includes(param.type))
}

export function sortParameters(
  parameters: ParameterDefinition[],
  sortBy: 'header' | 'category' | 'type' | 'fixed'
): ParameterDefinition[] {
  return [...parameters].sort((a, b) => {
    switch (sortBy) {
      case 'header':
        return a.header.localeCompare(b.header)
      case 'category':
        return (a.category || '').localeCompare(b.category || '')
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
}

// Enhanced version of your existing mergeAndCategorizeParameters
export function mergeAndCategorizeParameters(
  fixedParams: FixedParameterGroup[],
  fetchedParams: ParameterDefinition[],
  selectedCategories: string[]
): ParameterDefinition[] {
  const result: ParameterDefinition[] = []
  const seenFields = new Set<string>()

  // First, add fixed parameters for selected categories
  fixedParams
    .filter((group) => selectedCategories.includes(group.category))
    .forEach((group) => {
      group.parameters.forEach((param) => {
        if (!seenFields.has(param.field)) {
          result.push({ ...param, isFixed: true })
          seenFields.add(param.field)
        }
      })
    })

  // Then add fetched parameters if they're not already included
  fetchedParams.forEach((param) => {
    if (!seenFields.has(param.field)) {
      result.push({ ...param, isFixed: false })
      seenFields.add(param.field)
    }
  })

  return result.sort((a, b) => {
    if (a.category !== b.category) {
      return (a.category || '').localeCompare(b.category || '')
    }
    if (a.isFixed !== b.isFixed) {
      return a.isFixed ? -1 : 1
    }
    return a.header.localeCompare(b.header)
  })
}

// Add helper functions for parameter analysis
export function getUniqueCategories(parameters: ParameterDefinition[]): string[] {
  return [...new Set(parameters.filter((p) => p.category).map((p) => p.category!))]
}

export function getUniqueTypes(parameters: ParameterDefinition[]): string[] {
  return [...new Set(parameters.filter((p) => p.type).map((p) => p.type!))]
}

export function getParameterStats(parameters: ParameterDefinition[]) {
  return {
    total: parameters.length,
    fixedCount: parameters.filter((p) => p.isFixed).length,
    newCount: parameters.filter((p) => !p.isFixed).length,
    categories: getUniqueCategories(parameters),
    types: getUniqueTypes(parameters)
  }
}

// Add a composable for parameter management
export function useParameterManagement(initialParams: ParameterDefinition[] = []) {
  const parameters = ref(initialParams)
  const searchTerm = ref('')
  const selectedTypes = ref<string[]>([])
  const sortBy = ref<'header' | 'category' | 'type' | 'fixed'>('category')

  const filteredParameters = computed(() => {
    let result = [...parameters.value]

    if (searchTerm.value) {
      result = searchParameters(result, searchTerm.value)
    }

    if (selectedTypes.value.length) {
      result = filterByTypes(result, selectedTypes.value)
    }

    return sortParameters(result, sortBy.value)
  })

  const stats = computed(() => getParameterStats(parameters.value))

  return {
    parameters,
    searchTerm,
    selectedTypes,
    sortBy,
    filteredParameters,
    stats,

    // Methods
    setParameters: (params: ParameterDefinition[]) => (parameters.value = params),
    updateSearch: (term: string) => (searchTerm.value = term),
    toggleType: (type: string) => {
      const index = selectedTypes.value.indexOf(type)
      if (index === -1) {
        selectedTypes.value.push(type)
      } else {
        selectedTypes.value.splice(index, 1)
      }
    },
    setSortBy: (sort: 'header' | 'category' | 'type' | 'fixed') => (sortBy.value = sort)
  }
}

export type { ParameterGroup }

export {
  filterParametersByType,
  getParameterTypes,
  getCommonParameters,
  generateParameterSummary,
  groupParametersByCategory
} from './parameterUtilities'
