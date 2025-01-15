import type { BimValueType, PrimitiveValue } from '../../types/parameters/value-types'

/**
 * Infer BIM value type from string
 */
export function inferBimValueType(type: string | undefined): BimValueType {
  switch (type?.toLowerCase()) {
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'date':
      return 'date'
    case 'object':
      return 'object'
    case 'array':
      return 'array'
    default:
      return 'string'
  }
}

/**
 * Get default value for BIM type
 */
export function getDefaultValueForType(type: BimValueType): PrimitiveValue {
  switch (type) {
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'date':
      return new Date().toISOString()
    case 'object':
      return '{}'
    case 'array':
      return '[]'
    default:
      return ''
  }
}
