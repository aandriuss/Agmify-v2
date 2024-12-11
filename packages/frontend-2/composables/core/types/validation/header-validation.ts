import type { ProcessedHeader } from '../viewer/viewer-base'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

/**
 * Type guard for ProcessedHeader
 */
export function isValidHeader(value: unknown): value is ProcessedHeader {
  if (!value || typeof value !== 'object') return false

  try {
    const header = value as Record<string, unknown>
    const isValid =
      typeof header.field === 'string' &&
      typeof header.header === 'string' &&
      typeof header.type === 'string' &&
      typeof header.category === 'string' &&
      typeof header.description === 'string' &&
      typeof header.fetchedGroup === 'string' &&
      typeof header.currentGroup === 'string' &&
      typeof header.isFetched === 'boolean' &&
      typeof header.source === 'string'

    if (!isValid) {
      debug.warn(DebugCategories.VALIDATION, 'Invalid header structure', {
        value,
        missingFields: [
          !header.field && 'field',
          !header.header && 'header',
          !header.type && 'type',
          !header.category && 'category',
          !header.description && 'description',
          !header.fetchedGroup && 'fetchedGroup',
          !header.currentGroup && 'currentGroup',
          typeof header.isFetched !== 'boolean' && 'isFetched',
          !header.source && 'source'
        ].filter(Boolean)
      })
    }

    return isValid
  } catch (err) {
    debug.error(DebugCategories.VALIDATION, 'Header validation error:', err)
    return false
  }
}

/**
 * Process an array of headers, filtering out invalid ones
 */
export function processHeaders(headers: unknown[]): ProcessedHeader[] {
  const processed = headers.filter(isValidHeader)
  if (processed.length !== headers.length) {
    debug.warn(DebugCategories.PARAMETERS, 'Some headers failed validation', {
      total: headers.length,
      valid: processed.length,
      invalid: headers.length - processed.length
    })
  }
  return processed
}
