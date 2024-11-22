import type { ParameterValue, BIMNodeRaw } from '../types'

/**
 * Transform raw value to appropriate type for table calculations
 */
export function transformParameterValue(value: unknown): ParameterValue {
  // Handle null/undefined
  if (value === null || value === undefined) return null

  // Handle numbers
  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }

  // Handle strings that might be numbers
  if (typeof value === 'string') {
    const trimmed = value.trim()

    // Handle percentages
    if (trimmed.endsWith('%')) {
      const num = parseFloat(trimmed)
      return isNaN(num) ? trimmed : num / 100
    }

    // Handle currency
    if (trimmed.startsWith('$')) {
      const num = parseFloat(trimmed.substring(1))
      return isNaN(num) ? trimmed : num
    }

    // Try to convert to number if possible
    const num = parseFloat(trimmed)
    if (!isNaN(num) && String(num) === trimmed) {
      return num
    }

    return trimmed
  }

  // Handle booleans
  if (typeof value === 'boolean') {
    return value
  }

  // Handle objects that might be parameter value states
  if (value && typeof value === 'object') {
    // If it's already a parameter value state, return its currentValue
    if (
      'currentValue' in value &&
      'fetchedValue' in value &&
      'previousValue' in value
    ) {
      return (value as { currentValue: unknown }).currentValue
    }

    // Try to get value from common properties
    if ('value' in value) {
      return transformParameterValue((value as { value: unknown }).value)
    }
    if ('Mark' in value) {
      return transformParameterValue((value as { Mark: unknown }).Mark)
    }
    if ('id' in value) {
      return transformParameterValue((value as { id: unknown }).id)
    }

    // If no known properties found, convert to string
    return String(value)
  }

  // Convert anything else to string
  return String(value)
}

/**
 * Get value from raw BIM data with type safety
 */
export function getRawValue(raw: BIMNodeRaw, key: string): unknown {
  // First try BIM-specific fields
  if (key === 'mark' && raw.Mark !== undefined) {
    return raw.Mark
  }
  if (key === 'category' && raw.Other?.Category !== undefined) {
    return raw.Other.Category
  }
  if (key === 'host' && raw.Constraints?.Host !== undefined) {
    return raw.Constraints.Host
  }

  // Then try parameters
  if (raw.parameters && typeof raw.parameters === 'object') {
    const params = raw.parameters as Record<string, unknown>
    if (key in params) {
      return transformParameterValue(params[key])
    }
  }

  // Finally try raw object directly
  if (key in raw) {
    return transformParameterValue(raw[key])
  }

  return null
}

/**
 * Type guard for checking if a value is a record object
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Safely stringify any value, handling special cases
 */
export function safeStringify(value: unknown): string {
  try {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    if (value instanceof Date) return value.toISOString()
    if (Array.isArray(value)) return value.map(safeStringify).join(', ')
    if (isRecord(value)) {
      try {
        return JSON.stringify(value)
      } catch {
        return '[Object]'
      }
    }
    return String(value)
  } catch {
    return '[Unknown]'
  }
}
