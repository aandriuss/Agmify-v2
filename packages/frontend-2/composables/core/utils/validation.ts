/**
 * Type validation utilities
 */

/**
 * Ensure string value with type safety
 */
export function safeString(value: unknown, defaultValue: string): string {
  return typeof value === 'string' && value.length > 0 ? value : defaultValue
}

/**
 * Ensure boolean value with type safety
 */
export function safeBoolean(value: unknown, defaultValue: boolean): boolean {
  return typeof value === 'boolean' ? value : defaultValue
}

/**
 * Ensure number value with type safety
 */
export function safeNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && !isNaN(value) ? value : defaultValue
}

/**
 * Ensure array value with type safety
 */
export function safeArray<T>(value: unknown, defaultValue: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : defaultValue
}

/**
 * Ensure object value with type safety
 */
export function safeObject<T extends Record<string, unknown>>(
  value: unknown,
  defaultValue: T
): T {
  return typeof value === 'object' && value !== null ? (value as T) : defaultValue
}

/**
 * Ensure date value with type safety
 */
export function safeDate(value: unknown, defaultValue: Date): Date {
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? defaultValue : date
  }
  return defaultValue
}

/**
 * Ensure enum value with type safety
 */
export function safeEnum<T extends string>(
  value: unknown,
  validValues: readonly T[],
  defaultValue: T
): T {
  return typeof value === 'string' && validValues.includes(value as T)
    ? (value as T)
    : defaultValue
}

/**
 * Ensure ID value with type safety
 */
export function safeId(value: unknown): string {
  return typeof value === 'string' && value.length > 0 ? value : crypto.randomUUID()
}

/**
 * Type check utilities
 */

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

/**
 * Check if value is a valid number
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Check if value is a valid date
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime())
}

/**
 * Check if value is a valid object
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Check if value is a valid array
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value)
}

/**
 * Check if value is a valid enum value
 */
export function isValidEnum<T extends string>(
  value: unknown,
  validValues: readonly T[]
): value is T {
  return typeof value === 'string' && validValues.includes(value as T)
}
