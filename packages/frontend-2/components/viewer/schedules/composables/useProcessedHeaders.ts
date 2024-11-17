import { computed } from 'vue'
import type { AvailableHeaders, ProcessedHeader } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { isProcessedHeader } from '../types'
import type { ComputedRef } from 'vue'

interface UseProcessedHeadersOptions {
  headers: ComputedRef<{ parent: unknown[]; child: unknown[] }>
}

export function useProcessedHeaders(options: UseProcessedHeadersOptions) {
  const processHeaders = (headers: unknown[]): ProcessedHeader[] => {
    const processed = headers.filter(isProcessedHeader)
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
