import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { parentCategories } from '~/composables/core/config/categories'
import { getMostSpecificCategory } from '~/composables/core/config/categoryMapping'
import type {
  ElementData,
  RawParameter,
  AvailableBimParameter,
  ParameterValue
} from '~/composables/core/types'
import { createAvailableBimParameter } from '~/composables/core/types/parameters'
import { inferParameterType } from '~/composables/core/parameters/utils/group-processing'

/**
 * Check if value is a record object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Convert value to parameter value with proper type handling
 */
export function convertToParameterValue(value: unknown): ParameterValue {
  if (value === null || value === undefined) return null

  // Handle numeric strings
  if (typeof value === 'string') {
    const num = Number(value)
    if (!isNaN(num)) return num
    return value
  }

  // Handle primitives
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'boolean') return value

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
  debug.startState(DebugCategories.PARAMETERS, 'Extracting raw parameters')
  const rawParams: RawParameter[] = []
  const seenParams = new Set<string>()

  if (!elements?.length) {
    debug.warn(DebugCategories.PARAMETERS, 'No elements provided')
    return []
  }

  try {
    // Process each element
    elements.forEach((element) => {
      if (!element?.parameters) return

      Object.entries(element.parameters).forEach(([key, value]) => {
        // Skip system parameters and already seen parameters
        if (key.startsWith('__') || seenParams.has(key)) return
        seenParams.add(key)

        // Parse JSON strings
        let parsedValue: unknown = value
        let isJsonString = false
        if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
          try {
            const parsed = JSON.parse(value) as Record<string, unknown>
            if (isRecord(parsed)) {
              parsedValue = parsed
              isJsonString = true
            }
          } catch {
            // Keep original value if parsing fails
          }
        }

        // Validate value
        const validatedValue = validateValue(parsedValue)
        if (validatedValue === null) return

        // Determine if parameter is parent
        const isParent =
          element.metadata?.isParent ||
          (element.category && parentCategories.includes(element.category))

        // Split parameter name into group and name parts
        const nameParts = key.split('.')
        const groupName = nameParts.length > 1 ? nameParts[0] : undefined
        const paramName = nameParts.length > 1 ? nameParts.slice(1).join('.') : key

        // Create raw parameter
        const rawParam: RawParameter = {
          id: key,
          name: paramName,
          value: validatedValue,
          fetchedGroup: groupName || element.category || 'Uncategorized',
          metadata: {
            category: element.category || 'Uncategorized',
            mappedCategory: element.category
              ? getMostSpecificCategory(element.category)
              : 'Uncategorized',
            isSystem: groupName?.startsWith('__') || false,
            elementId: element.id,
            isJsonString,
            isParent,
            originalGroup: groupName,
            displayName: paramName
          }
        }

        rawParams.push(rawParam)

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
              fetchedGroup: element.category || 'Uncategorized',
              metadata: {
                category: element.category,
                mappedCategory: element.category
                  ? getMostSpecificCategory(element.category)
                  : 'Uncategorized',
                isSystem: false,
                elementId: element.id,
                isNested: true,
                parentKey: key,
                isParent
              }
            }

            rawParams.push(nestedParam)
          })
        }
      })
    })

    debug.completeState(DebugCategories.PARAMETERS, 'Raw parameters extracted', {
      count: rawParams.length,
      elementCount: elements.length,
      categories: Array.from(
        new Set(rawParams.map((p) => p.metadata?.category || 'Uncategorized'))
      )
    })

    return rawParams
  } catch (err) {
    debug.error(DebugCategories.PARAMETERS, 'Failed to extract parameters:', err)
    throw err
  }
}

/**
 * Process raw parameters into available parameters
 */
export function processRawParameters(rawParams: RawParameter[]): {
  parent: AvailableBimParameter[]
  child: AvailableBimParameter[]
} {
  debug.startState(DebugCategories.PARAMETERS, 'Processing raw parameters')

  try {
    const { parent, child } = rawParams.reduce<{
      parent: AvailableBimParameter[]
      child: AvailableBimParameter[]
    }>(
      (acc, param) => {
        try {
          // Convert value
          const value = convertToParameterValue(param.value)

          // Determine parameter type based on value
          const type = inferParameterType(value)

          // Create BIM parameter with proper group handling
          const processedParam = createAvailableBimParameter(
            {
              ...param,
              name: param.metadata?.displayName || param.name,
              fetchedGroup: param.metadata?.originalGroup || param.fetchedGroup,
              metadata: {
                ...param.metadata,
                groupId: param.metadata?.originalGroup
                  ? `bim_${param.metadata.originalGroup}`
                  : '',
                displayName: param.metadata?.displayName || param.name,
                originalGroup: param.metadata?.originalGroup || ''
              }
            },
            type,
            value
          )

          // Categorize into parent/child
          const isParent =
            param.metadata?.isParent ||
            (param.metadata?.category &&
              parentCategories.includes(param.metadata.category))

          if (isParent) {
            acc.parent.push(processedParam)
          } else {
            acc.child.push(processedParam)
          }
        } catch (err) {
          debug.warn(
            DebugCategories.PARAMETERS,
            `Failed to process parameter ${param.id}:`,
            err
          )
        }
        return acc
      },
      { parent: [], child: [] }
    )

    debug.completeState(DebugCategories.PARAMETERS, 'Parameters processed', {
      rawCount: rawParams.length,
      processedCount: {
        parent: parent.length,
        child: child.length
      },
      sample:
        parent[0] || child[0]
          ? {
              id: (parent[0] || child[0]).id,
              kind: (parent[0] || child[0]).kind,
              category: (parent[0] || child[0]).metadata?.category,
              isParent: !!parent[0]
            }
          : null
    })

    return { parent, child }
  } catch (err) {
    debug.error(DebugCategories.PARAMETERS, 'Failed to process parameters:', err)
    throw err
  }
}
