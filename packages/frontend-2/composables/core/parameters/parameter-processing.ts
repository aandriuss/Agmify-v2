import type { ElementData } from '~/composables/core/types'
import type { ParameterValue, BimValueType } from '~/composables/core/types/parameters'
import { isEquationValue, isPrimitiveValue } from '~/composables/core/types/parameters'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ColumnDefinition
} from '~/composables/core/parameters/store/types'
import {
  createAvailableBimParameter,
  createAvailableUserParameter,
  createSelectedParameter,
  createColumnDefinition
} from '~/composables/core/parameters/store/types'

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

  // For objects and arrays, stringify them
  return JSON.stringify(value)
}

/**
 * Extract raw parameters from elements
 */
export function extractRawParameters(elements: ElementData[]): RawParameter[] {
  const rawParams: RawParameter[] = []
  const stats = initParameterStats()
  const parameterGroups = new Map<string, Set<string>>()

  if (!elements?.length) {
    debug.warn(
      DebugCategories.PARAMETERS,
      'No elements provided for parameter extraction'
    )
    return []
  }

  // First pass: collect all unique parameters and their groups
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
            // Handle other dot notation
            group = parts[0]
            paramName = parts[1]
          } else {
            // Default case
            group = 'Parameters'
            paramName = key
          }

          // Add to parameter groups
          if (!parameterGroups.has(group)) {
            parameterGroups.set(group, new Set())
          }
          parameterGroups.get(group)!.add(paramName)

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

          // Create raw parameter
          const rawParam = {
            id: key,
            name: paramName,
            value: parsedValue,
            sourceGroup: group,
            metadata: {
              category: element.category,
              fullKey: key,
              isSystem: false,
              group,
              elementId: element.id,
              isJsonString
            }
          }

          // Add parameter for this element
          rawParams.push(rawParam)
          updateParameterStats(stats, key, parsedValue)

          // If this is a JSON object, also add its properties as nested parameters
          if (isJsonString && isRecord(parsedValue)) {
            Object.entries(parsedValue as Record<string, unknown>).forEach(
              ([nestedKey, nestedValue]) => {
                const nestedId = `${key}.${nestedKey}`
                const nestedParam = {
                  id: nestedId,
                  name: nestedKey,
                  value: nestedValue,
                  sourceGroup: group,
                  metadata: {
                    category: element.category,
                    fullKey: nestedId,
                    isSystem: false,
                    group,
                    elementId: element.id,
                    isNested: true,
                    parentKey: key
                  }
                }
                rawParams.push(nestedParam)
                updateParameterStats(stats, nestedId, nestedValue)
                debug.log(DebugCategories.PARAMETERS, 'Added nested parameter', {
                  id: nestedId,
                  name: nestedKey,
                  value: nestedValue,
                  group
                })
              }
            )
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
 */
export function processRawParameters(
  rawParams: RawParameter[]
): (AvailableBimParameter | AvailableUserParameter)[] {
  if (!rawParams?.length) {
    debug.warn(DebugCategories.PARAMETERS, 'No raw parameters provided for processing')
    return []
  }

  // debug.log(DebugCategories.PARAMETERS, 'Starting parameter processing', {
  //   count: rawParams.length,
  //   sample: rawParams[0]
  // })

  // First group parameters by their ID to handle duplicates
  const parameterGroups = new Map<string, RawParameter[]>()
  rawParams.forEach((param) => {
    if (!param.id || !param.name) {
      debug.warn(
        DebugCategories.PARAMETERS,
        'Invalid parameter: missing id or name',
        param
      )
      return
    }

    const existing = parameterGroups.get(param.id) || []
    parameterGroups.set(param.id, [...existing, param])
  })

  // debug.log(DebugCategories.PARAMETERS, 'Grouped raw parameters', {
  //   totalParams: rawParams.length,
  //   uniqueIds: parameterGroups.size,
  //   sample: Array.from(parameterGroups.entries())[0]
  // })

  // Process each unique parameter
  const processed = Array.from(parameterGroups.entries()).flatMap(([_id, params]) => {
    // Skip if no parameters
    if (!params.length) return []

    try {
      // Use the first parameter as the base
      const raw = params[0]

      // Special handling for JSON string values
      let processedValue: unknown = raw.value
      const nestedParams: RawParameter[] = []

      if (
        typeof raw.value === 'string' &&
        raw.value.startsWith('{') &&
        raw.value.endsWith('}')
      ) {
        try {
          const parsed = JSON.parse(raw.value) as Record<string, unknown>
          if (isRecord(parsed)) {
            processedValue = parsed
            // Extract nested parameters
            Object.entries(parsed).forEach(([key, value]) => {
              const nestedId = `${raw.id}.${key}`
              nestedParams.push({
                id: nestedId,
                name: key,
                value,
                sourceGroup: raw.sourceGroup,
                metadata: {
                  category: raw.metadata?.category || 'Uncategorized',
                  fullKey: nestedId,
                  isSystem: raw.metadata?.isSystem || false,
                  group: raw.metadata?.group || raw.sourceGroup,
                  elementId: raw.metadata?.elementId || raw.id,
                  isNested: true,
                  parentKey: raw.id,
                  isJsonString: false
                }
              })
            })
          }
        } catch (err) {
          // If JSON parsing fails, treat as regular string
          processedValue = raw.value
        }
      }

      // Convert value to parameter value with proper type inference
      const finalValue = convertToParameterValue(processedValue)

      // Infer parameter type based on value and context
      const type = inferParameterType(finalValue, raw)

      // Determine if this is a BIM or user parameter
      const isBimParameter = isParameterBim(raw)

      // Process nested parameters first
      const processedNested = nestedParams.map((nested) => {
        const nestedValue = convertToParameterValue(nested.value)
        const nestedType = inferParameterType(nestedValue, nested)
        return isBimParameter
          ? createAvailableBimParameter(nested, nestedType, nestedValue)
          : createAvailableUserParameter(
              nested.id,
              nested.name,
              'fixed',
              nestedValue,
              nested.sourceGroup
            )
      })

      // Create main parameter
      const mainParam = isBimParameter
        ? createAvailableBimParameter(raw, type, finalValue)
        : createAvailableUserParameter(
            raw.id,
            raw.name,
            'fixed',
            finalValue,
            raw.sourceGroup
          )

      // Return all parameters
      return [mainParam, ...processedNested]
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      const param = params[0]
      debug.warn(
        DebugCategories.PARAMETERS,
        `Failed to process parameter ${param.id}:`,
        error
      )

      // Create BIM parameter with default values instead of dropping it
      return [createAvailableBimParameter(param, 'string', String(param.value ?? ''))]
    }
  })

  // Flatten array and filter out any undefined/null values
  const validProcessed = processed.flat().filter(Boolean)

  // Log processing stats and verify state
  const _processedStats = {
    input: rawParams.length,
    processed: validProcessed.length,
    bim: validProcessed.filter((p): p is AvailableBimParameter => p.kind === 'bim')
      .length,
    user: validProcessed.filter((p): p is AvailableUserParameter => p.kind === 'user')
      .length,
    byType: validProcessed.reduce((acc, param) => {
      acc[param.type] = (acc[param.type] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byGroup: validProcessed.reduce((acc, param) => {
      const group = 'sourceGroup' in param ? param.sourceGroup : param.group
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // Verify processed parameters
  const isValid = validProcessed.every((param) => {
    if (param.kind === 'bim') {
      return (
        param.id && param.name && param.type && param.sourceGroup && param.currentGroup
      )
    }
    return param.id && param.name && param.type && param.group
  })

  if (!isValid) {
    debug.error(DebugCategories.PARAMETERS, 'Invalid processed parameters', {
      invalidParams: validProcessed.filter((param) => {
        if (param.kind === 'bim') {
          return !(
            param.id &&
            param.name &&
            param.type &&
            param.sourceGroup &&
            param.currentGroup
          )
        }
        return !(param.id && param.name && param.type && param.group)
      })
    })
    throw new Error('Invalid processed parameters')
  }

  // debug.log(DebugCategories.PARAMETERS, 'Parameter processing complete', {
  //   stats: processedStats,
  //   sample: validProcessed[0]
  // })

  return validProcessed
}

// Helper to determine if a parameter is BIM or user
function isParameterBim(raw: RawParameter): boolean {
  // Consider parameters BIM if they:
  // 1. Are part of standard IFC property sets
  if (raw.sourceGroup.startsWith('Pset_')) return true

  // 2. Are part of standard Revit categories and custom BIM groups
  const revitGroups = new Set([
    'Base',
    'Constraints',
    'Dimensions',
    'Identity Data',
    'Phasing',
    'Structural',
    'Other',
    'Graphics',
    'Materials',
    'Construction',
    'Analytical Properties',
    'Forces',
    'Parameters', // Standard parameters group
    'Framing', // Custom framing parameters
    'FM' // Facility management parameters
  ])
  if (revitGroups.has(raw.sourceGroup)) return true

  // 3. Have specific metadata indicating BIM origin
  if (raw.metadata?.isSystem) return true

  // 4. Are part of standard parameter groups
  if (raw.sourceGroup === 'Parameters' || raw.id.startsWith('Parameters.')) return true

  // 5. Check for common BIM parameter patterns
  const bimPatterns = [
    /^IFCBUILDING/i,
    /^IFCWALL/i,
    /^IFCSLAB/i,
    /^IFCWINDOW/i,
    /^IFCDOOR/i,
    /^IFC/i,
    /\.Type$/,
    /\.Category$/,
    /\.Family$/,
    /\.Material$/,
    /^FM_/i, // Facility management prefix
    /^CNC_/i, // CNC parameters
    /^Framing/i, // Framing parameters
    /Mark$/, // Mark parameters
    /Number$/, // Number parameters
    /Position$/, // Position parameters
    /Configuration$/ // Configuration parameters
  ]
  if (bimPatterns.some((pattern) => pattern.test(raw.id))) return true

  // 6. Check for nested parameters
  if (raw.metadata?.isNested && raw.metadata.parentKey) {
    // If parent parameter is BIM, consider this BIM too
    const parentId = raw.metadata.parentKey
    const parentGroup = parentId.split('.')[0]
    if (revitGroups.has(parentGroup) || parentGroup.startsWith('Pset_')) {
      return true
    }
  }

  // Otherwise consider it a user parameter
  return false
}

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
 * Create column definitions from selected parameters
 * Preserves existing column properties if available
 */
export function createColumnDefinitions(
  selectedParams: SelectedParameter[],
  existingColumns: ColumnDefinition[] = []
): ColumnDefinition[] {
  return selectedParams.map((param) => {
    const existing = existingColumns.find((col) => col.id === param.id)
    if (existing) {
      return {
        ...existing,
        name: param.name,
        value: param.value,
        type: param.type,
        visible: param.visible,
        order: param.order
      }
    }
    return createColumnDefinition(param)
  })
}

/**
 * Create BIM column definition from parameter
 */
export function createBimColumnDefinition(
  param: AvailableBimParameter
): ColumnDefinition {
  // First create selected parameter
  const selected = createSelectedParameter(param, 0, true)

  // Then create column definition
  return createColumnDefinition(selected)
}

/**
 * Create User column definition from parameter
 */
export function createUserColumnDefinition(
  param: AvailableUserParameter
): ColumnDefinition {
  // First create selected parameter
  const selected = createSelectedParameter(param, 0, true)

  // Then create column definition
  return createColumnDefinition(selected)
}

/**
 * Create column definitions from parameters with proper type handling
 */
export function createTypedColumnDefinitions(
  params: (AvailableBimParameter | AvailableUserParameter)[]
): ColumnDefinition[] {
  return params.map((param, index) => {
    // Create selected parameter first
    const selected = createSelectedParameter(param, index, true)

    // Then create column definition
    return createColumnDefinition(selected)
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
    // Handle other dot notation
    group = parts[0]
    paramName = parts[1]
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

function inferParameterType(value: ParameterValue, raw: RawParameter): BimValueType {
  // Check for special cases first
  if (raw.id.includes('GlobalId') || raw.id.includes('Id')) return 'string'
  if (raw.id.includes('Type') || raw.id.includes('Category')) return 'string'
  if (raw.sourceGroup === 'Identity Data') return 'string'

  // Infer from value
  if (value === null) return 'string'
  if (isEquationValue(value)) return value.resultType
  switch (typeof value) {
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'object':
      return Array.isArray(value) ? 'array' : 'object'
    default:
      return 'string'
  }
}
