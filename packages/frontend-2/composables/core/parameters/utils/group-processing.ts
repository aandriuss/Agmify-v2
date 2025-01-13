import type { BimValueType } from '~/composables/core/types/parameters'

/**
 * Helper function to infer parameter type
 */
export function inferParameterType(value: unknown): BimValueType {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

/**
 * Extract group name from parameter key
 */
export function extractGroupFromKey(key: string): string {
  const parts = key.split('.')
  return parts.length > 1 ? parts[0] : 'Ungrouped'
}

/**
 * Clean parameter name by removing group prefix
 */
export function cleanParameterName(key: string): string {
  const parts = key.split('.')
  return parts.length > 1 ? parts.slice(1).join('.') : key
}
