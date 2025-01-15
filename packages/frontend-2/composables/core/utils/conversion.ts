import type { BimValueType, UserValueType } from '../types/parameters/value-types'

/**
 * Convert text type to BIM value type
 */
export function toBimValueType(type: string | undefined): BimValueType {
  switch (type?.toLowerCase()) {
    case 'text':
    case 'string':
      return 'string'
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
 * Convert text type to user value type
 */
export function toUserValueType(type: string | undefined): UserValueType {
  switch (type?.toLowerCase()) {
    case 'equation':
      return 'equation'
    default:
      return 'fixed'
  }
}
