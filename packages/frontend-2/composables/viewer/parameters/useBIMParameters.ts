import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { BIMNodeRaw, ProcessedHeader } from '~/composables/core/types/viewer'
import type {
  BimParameter,
  BimValueType,
  PrimitiveValue
} from '~/composables/core/types'
import { createBimParameter } from '~/composables/core/types'
import { TableStateError } from '~/composables/core/types/errors'

type ParameterKey = 'width' | 'height' | 'length' | 'family' | 'mark' | 'category'

interface BIMParameterMapping {
  names: string[]
  type: BimValueType
}

const PARAMETER_MAPPINGS: Record<ParameterKey, BIMParameterMapping> = {
  width: {
    names: ['width', 'Width', 'b', 'B', 'Width Parameter'],
    type: 'number'
  },
  height: {
    names: ['height', 'Height', 'h', 'H', 'Height Parameter'],
    type: 'number'
  },
  length: {
    names: ['length', 'Length', 'l', 'L', 'Length Parameter'],
    type: 'number'
  },
  family: {
    names: ['family', 'Family', 'familyName', 'FamilyName', 'Family Type'],
    type: 'string'
  },
  mark: {
    names: ['mark', 'Mark', 'markId', 'MarkId'],
    type: 'string'
  },
  category: {
    names: ['category', 'Category', 'elementCategory', 'ElementCategory'],
    type: 'string'
  }
}

/**
 * Check if a property exists in an object
 */
function hasProperty<T extends object>(obj: T, prop: PropertyKey): prop is keyof T {
  return Object.prototype.hasOwnProperty.call(obj, prop)
}

/**
 * Extract BIM parameter from raw node
 */
function extractBIMParameter(
  raw: BIMNodeRaw,
  parameterName: string
): BimParameter | null {
  try {
    debug.startState(DebugCategories.PARAMETERS, 'Extracting BIM parameter', {
      nodeId: raw.id,
      parameterName
    })

    const defaultMapping: BIMParameterMapping = {
      names: [parameterName],
      type: 'string'
    }

    const mapping = hasProperty(PARAMETER_MAPPINGS, parameterName)
      ? PARAMETER_MAPPINGS[parameterName]
      : defaultMapping

    // Find value in raw data
    let value: unknown = null
    for (const name of mapping.names) {
      if (raw.parameters && hasProperty(raw.parameters, name)) {
        value = raw.parameters[name]
        break
      }

      if (hasProperty(raw, name)) {
        value = raw[name]
        break
      }
    }

    // Convert value to primitive
    const primitiveValue = convertToPrimitiveValue(value, mapping.type)

    // Create BIM parameter
    const parameter = createBimParameter({
      id: `${raw.id}_${parameterName}`,
      name: parameterName,
      field: parameterName,
      header: parameterName,
      type: mapping.type,
      visible: true,
      removable: true,
      value: primitiveValue,
      sourceValue: primitiveValue,
      fetchedGroup: 'BIM Parameters',
      currentGroup: 'BIM Parameters',
      metadata: {
        source: 'BIM',
        rawValue: value
      }
    })

    debug.completeState(DebugCategories.PARAMETERS, 'BIM parameter extracted', {
      parameterId: parameter.id,
      value: parameter.value
    })

    return parameter
  } catch (err) {
    const error =
      err instanceof Error
        ? new TableStateError('Failed to extract BIM parameter', err)
        : new TableStateError('Failed to extract BIM parameter')
    debug.error(DebugCategories.ERROR, error.message, { error, parameterName })
    return null
  }
}

/**
 * Convert raw value to primitive value
 */
function convertToPrimitiveValue(value: unknown, type: BimValueType): PrimitiveValue {
  if (value === null || value === undefined) return null

  switch (type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : null

    case 'number':
      if (typeof value === 'number') return isNaN(value) ? null : value
      if (typeof value === 'string') {
        const num = parseFloat(value)
        return isNaN(num) ? null : num
      }
      return null

    case 'string':
      return value === null || value === undefined ? null : String(value)

    default:
      return null
  }
}

/**
 * Process BIM node into header
 */
function processNodeHeader(raw: BIMNodeRaw): ProcessedHeader {
  return {
    id: raw.id,
    name: raw.type || 'Unknown',
    type: 'string',
    value: null
  }
}

/**
 * Hook for BIM parameter handling
 */
export function useBIMParameters() {
  return {
    extractBIMParameter,
    processNodeHeader,
    PARAMETER_MAPPINGS
  }
}
