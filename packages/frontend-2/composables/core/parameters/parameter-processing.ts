import type { ElementData } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { isEquationValue, isPrimitiveValue } from '~/composables/core/types/parameters'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { parentCategories } from '~/composables/core/config/categories'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '~/composables/core/parameters/store/types'
import {
  createAvailableBimParameter,
  createSelectedParameter
} from '~/composables/core/parameters/store/types'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import { createTableColumn } from '~/composables/core/types/tables/table-column'

interface ParameterStats {
  raw: number
  unique: Set<string>
  groups: Map<string, Set<string>>
  activeGroups: Map<string, Set<string>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !isEquationValue(value)
  )
}

export function safeParse(value: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value)
    if (!isRecord(parsed)) {
      return {}
    }
    return parsed
  } catch {
    return {}
  }
}

/**
 * Convert value to parameter value with proper type handling
 */
export function convertToParameterValue(value: unknown): ParameterValue {
  if (value === null || value === undefined) return null
  if (isPrimitiveValue(value)) return value
  if (isEquationValue(value)) return value

  // Handle numeric strings
  if (typeof value === 'string') {
    const num = Number(value)
    if (!isNaN(num)) return num
  }

  // For objects and arrays, stringify them
  return JSON.stringify(value)
}

/**
 * Validate parameter value
 */
function validateValue(value: unknown): unknown {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' && isNaN(value)) return null
  if (typeof value === 'string' && value.trim() === '') return null
  return value
}

/**
 * Extract raw parameters from elements
 */
export function extractRawParameters(elements: ElementData[]): RawParameter[] {
  const rawParams: RawParameter[] = []
  const stats = initParameterStats()

  if (!elements?.length) {
    debug.warn(
      DebugCategories.PARAMETERS,
      'No elements provided for parameter extraction'
    )
    return []
  }

  // Process each element
  elements.forEach((element) => {
    if (!element?.parameters) {
      debug.warn(DebugCategories.PARAMETERS, 'Element has no parameters', {
        elementId: element?.id,
        category: element?.category
      })
      return
    }

    try {
      // Process each parameter
      Object.entries(element.parameters as Record<string, unknown>).forEach(
        ([key, value]) => {
          // Skip system parameters
          if (key.startsWith('__')) return

          // Handle dot notation parameters
          const parts = key.split('.')
          let group: string
          let paramName: string

          if (key.startsWith('Parameters.')) {
            // Handle Parameters.* format
            group = 'Parameters'
            paramName = parts.slice(1).join('.')
          } else if (parts.length > 1) {
            // Handle dot notation (e.g. "Model Properties.Slope_Angle_End_T")
            group = parts[0]
            paramName = parts.slice(1).join('.')
          } else {
            // Default case
            group = 'Parameters'
            paramName = key
          }

          // Check if value is a JSON string
          let parsedValue: unknown = value
          let isJsonString = false
          if (
            typeof value === 'string' &&
            value.startsWith('{') &&
            value.endsWith('}')
          ) {
            try {
              const parsed = JSON.parse(value) as Record<string, unknown>
              if (isRecord(parsed)) {
                parsedValue = parsed
                isJsonString = true
              }
            } catch (err) {
              debug.warn(
                DebugCategories.PARAMETERS,
                `Failed to parse JSON parameter ${key}:`,
                err
              )
            }
          }

          // Validate value
          const validatedValue = validateValue(parsedValue)
          if (validatedValue === null) {
            debug.warn(DebugCategories.PARAMETERS, 'Skipping invalid parameter value', {
              id: key,
              originalValue: parsedValue
            })
            return
          }

          // Determine if parameter is parent based on element metadata or category
          const isParent =
            element.metadata?.isParent ||
            (element.category && parentCategories.includes(element.category))

          // Create raw parameter with parent/child info
          const rawParam: RawParameter = {
            id: key,
            name: paramName,
            value: validatedValue,
            sourceGroup: group,
            metadata: {
              category: element.category,
              fullKey: key,
              isSystem: false,
              group,
              elementId: element.id,
              isJsonString,
              isParent
            }
          }

          debug.log(DebugCategories.PARAMETERS, 'Parameter categorization', {
            id: key,
            category: element.category,
            isParent,
            value: validatedValue
          })

          // Add parameter and update stats
          rawParams.push(rawParam)
          updateParameterStats(stats, key, validatedValue)

          debug.log(DebugCategories.PARAMETERS, 'Created raw parameter', {
            id: key,
            value: validatedValue,
            isParent: element.metadata?.isParent || false
          })

          // Handle nested parameters for JSON objects
          if (isJsonString && isRecord(validatedValue)) {
            Object.entries(validatedValue).forEach(([nestedKey, nestedValue]) => {
              const validatedNestedValue = validateValue(nestedValue)
              if (validatedNestedValue === null) return

              const nestedId = `${key}.${nestedKey}`
              const nestedParam: RawParameter = {
                id: nestedId,
                name: nestedKey,
                value: validatedNestedValue,
                sourceGroup: group,
                metadata: {
                  category: element.category,
                  fullKey: nestedId,
                  isSystem: false,
                  group,
                  elementId: element.id,
                  isNested: true,
                  parentKey: key,
                  isParent: element.metadata?.isParent || false
                }
              }

              rawParams.push(nestedParam)
              updateParameterStats(stats, nestedId, validatedNestedValue)

              debug.log(DebugCategories.PARAMETERS, 'Created nested parameter', {
                id: nestedId,
                value: validatedNestedValue,
                isParent: element.metadata?.isParent || false
              })
            })
          }
        }
      )
    } catch (err) {
      debug.error(
        DebugCategories.PARAMETERS,
        `Failed to process parameters for element ${element.id}:`,
        err
      )
    }
  })

  // Log extraction stats
  const uniqueGroups = Array.from(stats.groups.keys())
  const totalParams = rawParams.length
  const uniqueParams = stats.unique.size

  debug.log(DebugCategories.PARAMETERS, 'Parameter extraction complete', {
    elementCount: elements.length,
    parameterCount: {
      total: totalParams,
      unique: uniqueParams,
      groups: uniqueGroups.length
    },
    groups: Object.fromEntries(
      Array.from(stats.groups.entries()).map(([group, params]) => [
        group,
        {
          total: params.size,
          active: stats.activeGroups.get(group)?.size || 0,
          parameters: Array.from(params),
          activeParameters: Array.from(stats.activeGroups.get(group) || new Set())
        }
      ])
    ),
    sample: rawParams[0]
  })

  return rawParams
}

/**
 * Process raw parameters into available parameters
 * All parameters from world tree are BIM parameters
 * User parameters come from PostgreSQL or user creation
 */
export function processRawParameters(
  rawParams: RawParameter[]
): AvailableBimParameter[] {
  if (!rawParams?.length) {
    debug.warn(DebugCategories.PARAMETERS, 'No raw parameters provided for processing')
    return []
  }

  // Log input parameters
  debug.log(DebugCategories.PARAMETERS, 'Processing raw parameters', {
    count: rawParams.length,
    categories: Array.from(
      new Set(rawParams.map((p) => p.metadata?.category || 'Uncategorized'))
    )
  })

  // Process each parameter from world tree as BIM parameter
  const processed = rawParams
    .map((param) => {
      try {
        // Convert value
        const value = convertToParameterValue(param.value)

        // Ensure metadata is properly set
        param.metadata = {
          ...param.metadata,
          category: param.metadata?.category || 'Uncategorized',
          isParent:
            param.metadata?.isParent ||
            parentCategories.includes(param.metadata?.category || '')
        }

        // Create BIM parameter
        const bimParam = createAvailableBimParameter(
          param,
          'string', // Default to string type for simplicity
          value,
          false
        )

        debug.log(DebugCategories.PARAMETERS, 'BIM parameter created', {
          id: param.id,
          category: param.metadata?.category,
          isParent: param.metadata?.isParent
        })

        return bimParam
      } catch (err) {
        debug.warn(
          DebugCategories.PARAMETERS,
          `Failed to process parameter ${param.id}:`,
          err
        )
        return null
      }
    })
    .filter((param): param is AvailableBimParameter => param !== null)

  // Log processing stats
  const processedStats = {
    input: rawParams.length,
    processed: processed.length,
    byGroup: processed.reduce((acc, param) => {
      acc[param.sourceGroup] = (acc[param.sourceGroup] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  debug.log(DebugCategories.PARAMETERS, 'Parameter processing complete', {
    stats: processedStats
  })

  return processed
}

// All parameters from world tree are BIM parameters
// User parameters are only created through the parameter manager

/**
 * Create selected parameters from available parameters
 * Assigns order based on parameter group and name
 */
export function createSelectedParameters(
  availableParams: (AvailableBimParameter | AvailableUserParameter)[],
  existingSelected: SelectedParameter[] = []
): SelectedParameter[] {
  // Sort parameters by group and name for consistent ordering
  const sortedParams = [...availableParams].sort((a, b) => {
    const groupA = 'sourceGroup' in a ? a.sourceGroup : a.group
    const groupB = 'sourceGroup' in b ? b.sourceGroup : b.group
    if (groupA !== groupB) return groupA.localeCompare(groupB)
    return a.name.localeCompare(b.name)
  })

  // Create selected parameters with order
  return sortedParams.map((param, index) => {
    const existing = existingSelected.find((p) => p.id === param.id)
    if (existing) {
      return {
        ...existing,
        name: param.name,
        value: param.value,
        type: param.type
      }
    }
    return createSelectedParameter(param, index)
  })
}

/**
 * Create table columns from selected parameters
 * Preserves existing column properties if available
 */
export function createTableColumns(
  selectedParams: SelectedParameter[],
  existingColumns: TableColumn[] = []
): TableColumn[] {
  return selectedParams.map((param) => {
    const existing = existingColumns.find((col) => col.id === param.id)
    if (existing) {
      return {
        ...existing,
        header: param.name,
        visible: param.visible,
        parameter: param
      }
    }
    return createTableColumn(param)
  })
}

// Utilities

function initParameterStats(): ParameterStats {
  return {
    raw: 0,
    unique: new Set(),
    groups: new Map(),
    activeGroups: new Map()
  }
}

function updateParameterStats(
  stats: ParameterStats,
  key: string,
  _value: unknown
): void {
  stats.raw++
  stats.unique.add(key)

  // Handle parameter grouping
  const parts = key.split('.')
  let group: string
  let paramName: string

  if (key.startsWith('Parameters.')) {
    // Handle Parameters.* format
    group = 'Parameters'
    paramName = parts.slice(1).join('.')
  } else if (parts.length > 1) {
    // Handle dot notation (e.g. "Model Properties.Slope_Angle_End_T")
    group = parts[0]
    paramName = parts.slice(1).join('.')
  } else {
    // Default case
    group = 'Parameters'
    paramName = key
  }

  if (!stats.groups.has(group)) {
    stats.groups.set(group, new Set())
    stats.activeGroups.set(group, new Set())
  }
  stats.groups.get(group)!.add(paramName)
  if (!key.startsWith('__')) {
    stats.activeGroups.get(group)!.add(paramName)
  }
}
