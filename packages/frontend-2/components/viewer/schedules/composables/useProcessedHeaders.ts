import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { debug, DebugCategories } from '../debug/useDebug'
import type { AvailableHeaders, ProcessedHeader } from '../types'

interface UseProcessedHeadersOptions {
  headers: ComputedRef<{ parent: unknown[]; child: unknown[] }>
}

export function useProcessedHeaders(options: UseProcessedHeadersOptions) {
  // Type guard for ProcessedHeader
  function isValidHeader(value: unknown): value is ProcessedHeader {
    if (!value || typeof value !== 'object') return false
    const header = value as Record<string, unknown>
    return (
      typeof header.field === 'string' &&
      typeof header.header === 'string' &&
      typeof header.type === 'string' &&
      typeof header.category === 'string' &&
      typeof header.description === 'string' &&
      typeof header.fetchedGroup === 'string' &&
      typeof header.currentGroup === 'string' &&
      typeof header.isFetched === 'boolean' &&
      typeof header.source === 'string'
    )
  }

  const processHeaders = (headers: unknown[]): ProcessedHeader[] => {
    const processed = headers.filter(isValidHeader)
    if (processed.length !== headers.length) {
      debug.warn(DebugCategories.PARAMETERS, 'Some headers failed validation', {
        total: headers.length,
        valid: processed.length
      })
    }
    return processed
  }

  const processedHeaders = computed<AvailableHeaders>(() => {
    try {
      const rawHeaders = options.headers.value
      return {
        parent: processHeaders(rawHeaders.parent),
        child: processHeaders(rawHeaders.child)
      }
    } catch (error) {
      debug.error(DebugCategories.PARAMETERS, 'Failed to process headers:', error)
      return { parent: [], child: [] }
    }
  })

  return {
    processedHeaders
  }
}
