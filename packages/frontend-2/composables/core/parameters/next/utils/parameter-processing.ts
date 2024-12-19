import type { ElementData } from '~/composables/core/types'
import type { ParameterValue, BimValueType } from '~/composables/core/types/parameters'
import { isEquationValue } from '~/composables/core/types/parameters'
import { convertToParameterValue } from '~/composables/core/parameters/utils/parameter-conversion'
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
 * Extract raw parameters from elements
 */
export function extractRawParameters(elements: ElementData[]): RawParameter[] {
  const rawParams: RawParameter[] = []
  const stats = initParameterStats()

  elements.forEach((element) => {
    if (!element.parameters) return

    Object.entries(element.parameters).forEach(([key, value]) => {
      // Skip system parameters
      if (key.startsWith('__')) return

      // Handle special cases like Pset_BuildingCommon
      if (key.startsWith('Pset_') && typeof value === 'string') {
        const parsed = safeParse(value)
        if (Object.keys(parsed).length > 0) {
          Object.entries(parsed).forEach(([psetKey, psetValue]) => {
            const fullKey = `${key}.${psetKey}`
            addRawParameter(rawParams, fullKey, psetValue, element.category, stats)
          })
          return
        }
      }

      // Handle Identity Data and Dimensions groups
      if ((key === 'Identity Data' || key === 'Dimensions') && isRecord(value)) {
        const group = key
        Object.entries(value).forEach(([groupKey, groupValue]) => {
          const fullKey = `${group}.${groupKey}`
          addRawParameter(rawParams, fullKey, groupValue, element.category, stats)
        })
        return
      }

      // Handle regular parameters
      addRawParameter(rawParams, key, value, element.category, stats)
    })
  })

  debug.log(DebugCategories.PARAMETERS, 'Parameter extraction stats', {
    elementCount: elements.length,
    raw: stats.raw,
    unique: stats.unique.size,
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
    )
  })

  return rawParams
}

/**
 * Process raw parameters into available parameters
 */
export async function processRawParameters(
  rawParams: RawParameter[]
): Promise<(AvailableBimParameter | AvailableUserParameter)[]> {
  debug.log(DebugCategories.PARAMETERS, 'Processing raw parameters', {
    count: rawParams.length
  })

  const processed = await Promise.all(
    rawParams.map(async (raw) => {
      try {
        // Convert raw value to parameter value with proper type inference
        const processedValue = await convertToParameterValue(raw.value)

        // Infer parameter type based on value and context
        const type = inferParameterType(processedValue, raw)

        // Determine if this is a BIM or user parameter
        const isBimParameter = isParameterBim(raw)

        // Create appropriate parameter type
        if (isBimParameter) {
          return createAvailableBimParameter(raw, type, processedValue)
        } else {
          return createAvailableUserParameter(
            raw.id,
            raw.name,
            'fixed',
            processedValue,
            raw.sourceGroup
          )
        }
      } catch (err) {
        debug.warn(
          DebugCategories.PARAMETERS,
          `Failed to process parameter ${raw.id}:`,
          err
        )

        // Create BIM parameter with default values instead of dropping it
        return createAvailableBimParameter(raw, 'string', String(raw.value ?? ''))
      }
    })
  )

  // Log stats
  const stats = {
    total: processed.length,
    bim: processed.filter((p): p is AvailableBimParameter => p.kind === 'bim').length,
    user: processed.filter((p): p is AvailableUserParameter => p.kind === 'user')
      .length,
    byType: processed.reduce((acc, param) => {
      acc[param.type] = (acc[param.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  debug.log(DebugCategories.PARAMETERS, 'Parameters processed', { stats })

  // Return both BIM and user parameters
  return processed
}

// Helper to determine if a parameter is BIM or user
function isParameterBim(raw: RawParameter): boolean {
  // Consider parameters BIM if they:
  // 1. Are part of standard IFC property sets
  if (raw.sourceGroup.startsWith('Pset_')) return true

  // 2. Are part of standard Revit categories
  const revitGroups = new Set([
    'Constraints',
    'Dimensions',
    'Identity Data',
    'Phasing',
    'Structural',
    'Other',
    'Graphics'
  ])
  if (revitGroups.has(raw.sourceGroup)) return true

  // 3. Have specific metadata indicating BIM origin
  if (raw.metadata?.isBim) return true

  // 4. Are part of standard parameter groups
  if (raw.sourceGroup === 'Parameters') return true

  // Otherwise consider it a user parameter
  return false
}

/**
 * Create selected parameters from available parameters
 */
export function createSelectedParameters(
  availableParams: (AvailableBimParameter | AvailableUserParameter)[],
  existingSelected: SelectedParameter[] = []
): SelectedParameter[] {
  return availableParams.map((param, index) => {
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

// Utilities

function initParameterStats(): ParameterStats {
  return {
    raw: 0,
    unique: new Set(),
    groups: new Map(),
    activeGroups: new Map()
  }
}

function addRawParameter(
  params: RawParameter[],
  key: string,
  value: unknown,
  category: string | undefined,
  stats: ParameterStats
): void {
  stats.raw++
  stats.unique.add(key)

  // Handle parameter grouping
  const parts = key.split('.')
  const group = parts.length > 1 ? parts[0] : 'Parameters'
  const paramName = parts[parts.length - 1]

  if (!stats.groups.has(group)) {
    stats.groups.set(group, new Set())
    stats.activeGroups.set(group, new Set())
  }
  stats.groups.get(group)!.add(paramName)
  if (!key.startsWith('__')) {
    stats.activeGroups.get(group)!.add(paramName)
  }

  // Add raw parameter with full context
  params.push({
    id: key,
    name: paramName,
    value,
    sourceGroup: group,
    metadata: {
      category,
      fullKey: key,
      isSystem: key.startsWith('__'),
      group
    }
  })
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
