/**
 * Convert parameter value to primitive value
 * Used for converting raw parameter values to displayable format
 */
export function toPrimitiveValue(value: unknown): string | number | boolean | null {
  if (value === undefined || value === null) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  return String(value)
}
