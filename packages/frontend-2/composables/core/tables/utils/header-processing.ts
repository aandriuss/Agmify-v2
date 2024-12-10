import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { AvailableHeaders, Parameter } from '~/composables/core/types'
import { isValidHeader } from '~/composables/core/types/validation/header-validation'
import { processedHeaderToParameter } from '~/composables/core/utils/conversion/header-conversion'

export interface UseProcessedHeadersOptions {
  headers: ComputedRef<{ parent: unknown[]; child: unknown[] }>
}

/**
 * Process and validate table headers
 * @param options Configuration options
 * @returns Processed and validated headers
 */
export function useProcessedHeaders(options: UseProcessedHeadersOptions) {
  const processedHeaders = computed<AvailableHeaders>(() => {
    try {
      debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing headers')

      const rawHeaders = options.headers.value
      const result = {
        parent: processHeaders(rawHeaders.parent),
        child: processHeaders(rawHeaders.child)
      }

      debug.completeState(DebugCategories.DATA_TRANSFORM, 'Headers processed', {
        parentCount: result.parent.length,
        childCount: result.child.length
      })

      return result
    } catch (error) {
      debug.error(DebugCategories.DATA_TRANSFORM, 'Failed to process headers:', error)
      return { parent: [], child: [] }
    }
  })

  return {
    processedHeaders
  }
}

/**
 * Process an array of headers
 */
function processHeaders(headers: unknown[]): Parameter[] {
  const validHeaders = headers.filter(isValidHeader)
  if (validHeaders.length !== headers.length) {
    debug.warn(DebugCategories.DATA_VALIDATION, 'Some headers failed validation', {
      total: headers.length,
      valid: validHeaders.length,
      invalid: headers.length - validHeaders.length
    })
  }
  return validHeaders.map(processedHeaderToParameter)
}
