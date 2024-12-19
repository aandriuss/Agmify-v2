/**
 * Parameter Store Utilities
 */
import type {
  Parameter,
  ParameterValue,
  PrimitiveValue,
  BimValueType,
  ElementData,
  BimParameter,
  createBimParameterWithDefaults
} from '@/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { convertToParameterValue } from '~/composables/core/parameters/utils/parameter-conversion'

// Existing interfaces
interface EquationValue {
  kind: 'equation'
  expression: string
  references: string[]
  resultType: BimValueType
  computed?: unknown
}

interface ParameterValueObject {
  [key: string]: ParameterValue
}

type ValidParameterRecord = Record<string, PrimitiveValue>

// New interface for parameter stats
interface ParameterStats {
  raw: number
  unique: Set<string>
  groups: Map<string, Set<string>>
  activeGroups: Map<string, Set<string>>
}

/**
 * Type guard for primitive values
 */
function isPrimitiveValue(value: unknown): value is PrimitiveValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  )
}

/**
 * Type guard for equation values
 */
function isEquationValue(value: unknown): value is EquationValue {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('kind' in value) ||
    value.kind !== 'equation'
  ) {
    return false
  }

  const equation = value as Partial<EquationValue>
  return (
    typeof equation.expression === 'string' &&
    Array.isArray(equation.references) &&
    equation.references.every((ref) => typeof ref === 'string') &&
    typeof equation.resultType === 'string'
  )
}

/**
 * Type guard for parameter value objects
 */
function isParameterValueObject(value: unknown): value is ParameterValueObject {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !isEquationValue(value) &&
    Object.values(value as Record<string, unknown>).every(validateParameterValue)
  )
}

/**
 * Type guard for parameter records
 */
function isValidParameterRecord(value: unknown): value is ValidParameterRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every(isPrimitiveValue)
}

/**
 * Type guard for record objects
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !isEquationValue(value)
  )
}

/**
 * Safe parameter value parsing
 */
export function safeParse(value: string): ValidParameterRecord | null {
  try {
    const parsed = JSON.parse(value)
    return isValidParameterRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Parameter value validation
 */
export function validateParameterValue(value: unknown): value is ParameterValue {
  if (isPrimitiveValue(value)) return true

  if (Array.isArray(value)) {
    return value.every((v) => validateParameterValue(v))
  }

  if (typeof value === 'object' && value !== null) {
    if (isEquationValue(value)) return true
    if (isParameterValueObject(value)) return true
  }

  return false
}

/**
 * Parameter group extraction
 */
export function extractParameterGroup(param: Parameter): string {
  if (param.kind === 'bim') {
    return param.currentGroup || param.fetchedGroup || 'Parameters'
  }
  return param.group || 'Parameters'
}

/**
 * Parameter value comparison with type safety
 */
export function areParameterValuesEqual(a: ParameterValue, b: ParameterValue): boolean {
  // Handle primitive values
  if (isPrimitiveValue(a) && isPrimitiveValue(b)) {
    return a === b
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => areParameterValuesEqual(v, b[i]))
  }

  // Handle equation values
  if (isEquationValue(a) && isEquationValue(b)) {
    return (
      a.expression === b.expression &&
      a.resultType === b.resultType &&
      a.references.length === b.references.length &&
      a.references.every((ref, i) => ref === b.references[i])
    )
  }

  // Handle object values
  if (isParameterValueObject(a) && isParameterValueObject(b)) {
    const aKeys = Object.keys(a)
    const bKeys = Object.keys(b)
    return (
      aKeys.length === bKeys.length &&
      aKeys.every((k) => k in b && areParameterValuesEqual(a[k], b[k]))
    )
  }

  return false
}

/**
 * Initialize parameter stats
 */
function initParameterStats(): ParameterStats {
  return {
    raw: 0,
    unique: new Set(),
    groups: new Map(),
    activeGroups: new Map()
  }
}

/**
 * Add raw parameter with stats tracking
 */
function addRawParameter(
  params: Parameter[],
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

  // Create BIM parameter with proper defaults
  const param = createBimParameterWithDefaults({
    id: key,
    field: key,
    name: paramName,
    header: paramName,
    value: value as ParameterValue,
    sourceValue: value as PrimitiveValue,
    fetchedGroup: group,
    currentGroup: group,
    visible: true,
    removable: true,
    category,
    metadata: {
      category,
      fullKey: key,
      isSystem: key.startsWith('__'),
      group
    }
  })

  params.push(param)
}

/**
 * Extract raw parameters from elements
 */
export function extractRawParameters(elements: ElementData[]): Parameter[] {
  const rawParams: Parameter[] = []
  const stats = initParameterStats()

  elements.forEach((element) => {
    if (!element.parameters) return

    Object.entries(element.parameters).forEach(([key, value]) => {
      // Skip system parameters
      if (key.startsWith('__')) return

      // Handle special cases like Pset_BuildingCommon
      if (key.startsWith('Pset_') && typeof value === 'string') {
        const parsed = safeParse(value)
        if (parsed) {
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
 * Process raw parameters
 */
export async function processParameters(rawParams: Parameter[]): Promise<Parameter[]> {
  debug.log(DebugCategories.PARAMETERS, 'Processing raw parameters', {
    count: rawParams.length
  })

  const processed = await Promise.all(
    rawParams.map(async (raw) => {
      try {
        // Skip if already a BIM parameter
        if (raw.kind === 'bim') {
          return raw
        }

        // Convert raw value to parameter value with proper type inference
        const processedValue = await convertToParameterValue(raw.value ?? null)

        // Infer parameter type based on value and context
        const type = inferParameterType(processedValue, raw)

        // Create new parameter with processed value and type
        return createBimParameterWithDefaults({
          field: raw.field || raw.id,
          id: raw.id,
          name: raw.name,
          header: raw.header,
          type,
          value: processedValue,
          sourceValue: raw.value as PrimitiveValue,
          category: raw.category,
          metadata: raw.metadata
        })
      } catch (error) {
        debug.warn(
          DebugCategories.PARAMETERS,
          `Failed to process parameter ${raw.id}:`,
          error
        )

        // Create parameter with default values instead of dropping it
        return createBimParameterWithDefaults({
          field: raw.field || raw.id,
          id: raw.id,
          name: raw.name,
          header: raw.header,
          type: 'string',
          value: String(raw.value ?? ''),
          sourceValue: String(raw.value ?? '') as PrimitiveValue,
          category: raw.category,
          metadata: raw.metadata
        })
      }
    })
  )

  // Group parameters by type and source for stats
  const stats = processed.reduce(
    (acc: Record<string, Record<string, number>>, param: BimParameter) => {
      acc.byType[param.type] = (acc.byType[param.type] || 0) + 1
      acc.byGroup[param.currentGroup] = (acc.byGroup[param.currentGroup] || 0) + 1
      return acc
    },
    { byType: {}, byGroup: {} }
  )

  debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
    total: processed.length,
    stats
  })

  return processed
}

/**
 * Infer parameter type from value and context
 */
function inferParameterType(value: ParameterValue, raw: Parameter): BimValueType {
  // Check for special cases first
  if (raw.id.includes('GlobalId') || raw.id.includes('Id')) return 'string'
  if (raw.id.includes('Type') || raw.id.includes('Category')) return 'string'
  if (raw.kind === 'bim' && raw.currentGroup === 'Identity Data') return 'string'

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

/**
 * Export utilities
 */
export const parameterUtils = {
  // Existing exports
  safeParse,
  validateParameterValue,
  extractParameterGroup,
  areParameterValuesEqual,
  isPrimitiveValue,
  isEquationValue,
  isValidParameterRecord,
  isParameterValueObject,

  // New exports
  extractRawParameters,
  processParameters,
  inferParameterType
}
