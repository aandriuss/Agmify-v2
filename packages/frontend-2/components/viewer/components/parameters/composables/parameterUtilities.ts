import type { ParameterDefinition } from '../../tables/DataTable/composables/parameters/parameterManagement'

export interface ParameterGroup {
  category: string
  parameters: ParameterDefinition[]
}

export function groupParametersByCategory(
  parameters: ParameterDefinition[]
): ParameterGroup[] {
  const groups = parameters.reduce((acc, param) => {
    const category = param.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(param)
    return acc
  }, {} as Record<string, ParameterDefinition[]>)

  return Object.entries(groups)
    .map(([category, parameters]) => ({
      category,
      parameters: parameters.sort((a, b) => a.header.localeCompare(b.header))
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

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
      param.description?.toLowerCase().includes(normalizedSearch) ||
      param.category?.toLowerCase().includes(normalizedSearch)
  )
}

export function sortParameters(
  parameters: ParameterDefinition[],
  sortBy: 'name' | 'category' | 'type' | 'fixed'
): ParameterDefinition[] {
  return [...parameters].sort((a, b) => {
    switch (sortBy) {
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
}

export function filterParametersByType(
  parameters: ParameterDefinition[],
  types: string[]
): ParameterDefinition[] {
  if (!types.length) return parameters
  return parameters.filter((param) => param.type && types.includes(param.type))
}

export function getParameterTypes(parameters: ParameterDefinition[]): string[] {
  return [...new Set(parameters.filter((p) => p.type).map((p) => p.type!))]
}

export function getCommonParameters(
  parameters: ParameterDefinition[]
): ParameterDefinition[] {
  return parameters.filter((param) =>
    ['id', 'name', 'mark', 'category', 'type'].includes(param.field)
  )
}

export function getUniqueCategories(parameters: ParameterDefinition[]): string[] {
  return [...new Set(parameters.filter((p) => p.category).map((p) => p.category!))]
}

export function generateParameterSummary(parameters: ParameterDefinition[]) {
  return {
    total: parameters.length,
    fixedCount: parameters.filter((p) => p.isFixed).length,
    categories: getUniqueCategories(parameters),
    types: getParameterTypes(parameters)
  }
}
