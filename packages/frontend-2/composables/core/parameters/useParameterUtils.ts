import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { Parameter } from '~/composables/core/types'

export interface ParameterGroup {
  category: string
  parameters: Parameter[]
}

export interface ParameterSummary {
  total: number
  bimCount: number
  userCount: number
  categories: string[]
  types: string[]
}

export class ParameterUtilsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterUtilsError'
  }
}

/**
 * Groups parameters by their category
 */
export function groupParametersByCategory(parameters: Parameter[]): ParameterGroup[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Grouping parameters by category')

    const groups = parameters.reduce((acc, param) => {
      const category = param.category || 'Other'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(param)
      return acc
    }, {} as Record<string, Parameter[]>)

    const result = Object.entries(groups)
      .map(([category, parameters]) => ({
        category,
        parameters: parameters.sort((a, b) => a.header.localeCompare(b.header))
      }))
      .sort((a, b) => a.category.localeCompare(b.category))

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters grouped by category', {
      groupCount: result.length,
      parameterCount: parameters.length
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to group parameters:', err)
    throw new ParameterUtilsError(
      `Failed to group parameters: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Searches parameters based on a search term
 */
export function searchParameters(
  parameters: Parameter[],
  searchTerm: string
): Parameter[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Searching parameters', {
      searchTerm
    })

    const normalizedSearch = searchTerm.toLowerCase().trim()

    if (!normalizedSearch) {
      debug.log(
        DebugCategories.PARAMETERS,
        'Empty search term, returning all parameters'
      )
      return parameters
    }

    const result = parameters.filter(
      (param) =>
        param.header.toLowerCase().includes(normalizedSearch) ||
        param.field.toLowerCase().includes(normalizedSearch) ||
        param.description?.toLowerCase().includes(normalizedSearch) ||
        param.category?.toLowerCase().includes(normalizedSearch)
    )

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters searched', {
      matchCount: result.length,
      totalCount: parameters.length
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to search parameters:', err)
    throw new ParameterUtilsError(
      `Failed to search parameters: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Sorts parameters based on specified criteria
 */
export function sortParameters(
  parameters: Parameter[],
  sortBy: 'name' | 'category' | 'type' | 'fixed'
): Parameter[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Sorting parameters', { sortBy })

    const result = [...parameters].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.header.localeCompare(b.header)
        case 'category':
          return (a.category || 'Other').localeCompare(b.category || 'Other')
        case 'type':
          return (a.type || '').localeCompare(b.type || '')
        case 'fixed':
          // For fixed sorting, we consider BIM parameters as "fixed"
          if (a.kind === b.kind) {
            return a.header.localeCompare(b.header)
          }
          return a.kind === 'bim' ? -1 : 1
        default:
          return 0
      }
    })

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters sorted')
    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to sort parameters:', err)
    throw new ParameterUtilsError(
      `Failed to sort parameters: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Filters parameters by type
 */
export function filterParametersByType(
  parameters: Parameter[],
  types: string[]
): Parameter[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Filtering parameters by type', {
      types
    })

    if (!types.length) {
      debug.log(
        DebugCategories.PARAMETERS,
        'No types specified, returning all parameters'
      )
      return parameters
    }

    const result = parameters.filter(
      (param) => param.type && types.includes(param.type)
    )

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters filtered by type', {
      matchCount: result.length,
      totalCount: parameters.length
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to filter parameters:', err)
    throw new ParameterUtilsError(
      `Failed to filter parameters: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}

/**
 * Gets unique parameter types
 */
export function getParameterTypes(parameters: Parameter[]): string[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Getting unique parameter types')

    const types = [...new Set(parameters.filter((p) => p.type).map((p) => p.type!))]

    debug.completeState(DebugCategories.PARAMETERS, 'Parameter types retrieved', {
      typeCount: types.length,
      types
    })

    return types
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to get parameter types:', err)
    throw new ParameterUtilsError(
      `Failed to get parameter types: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}

/**
 * Gets common parameters (id, name, mark, category, type)
 */
export function getCommonParameters(parameters: Parameter[]): Parameter[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Getting common parameters')

    const commonFields = ['id', 'name', 'mark', 'category', 'type']
    const result = parameters.filter((param) => commonFields.includes(param.field))

    debug.completeState(DebugCategories.PARAMETERS, 'Common parameters retrieved', {
      commonCount: result.length,
      totalCount: parameters.length
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to get common parameters:', err)
    throw new ParameterUtilsError(
      `Failed to get common parameters: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}

/**
 * Gets unique parameter categories
 */
export function getUniqueCategories(parameters: Parameter[]): string[] {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Getting unique categories')

    const categories = [
      ...new Set(parameters.filter((p) => p.category).map((p) => p.category!))
    ]

    debug.completeState(DebugCategories.PARAMETERS, 'Categories retrieved', {
      categoryCount: categories.length,
      categories
    })

    return categories
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to get unique categories:', err)
    throw new ParameterUtilsError(
      `Failed to get unique categories: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}

/**
 * Generates a summary of parameters
 */
export function generateParameterSummary(parameters: Parameter[]): ParameterSummary {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Generating parameter summary')

    const summary = {
      total: parameters.length,
      bimCount: parameters.filter((p) => p.kind === 'bim').length,
      userCount: parameters.filter((p) => p.kind === 'user').length,
      categories: getUniqueCategories(parameters),
      types: getParameterTypes(parameters)
    }

    debug.completeState(
      DebugCategories.PARAMETERS,
      'Parameter summary generated',
      summary
    )

    return summary
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to generate parameter summary:', err)
    throw new ParameterUtilsError(
      `Failed to generate parameter summary: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}
