import type {
  ElementData,
  TableRow,
  Parameter,
  ParameterValue
} from '~/composables/core/types'
import { debug, DebugCategories } from '../../debug/useDebug'
import {
  createParameterValueState,
  isEquationValue,
  isUserParameter
} from '~/composables/core/types'

// Custom error class for validation errors
export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    message: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// Processing options
export interface ProcessingOptions {
  batchSize?: number
  onProgress?: (progress: ProcessingProgress) => void
  defaultValues?: Record<string, ParameterValue>
  cacheSize?: number
}

export interface ProcessingProgress {
  processed: number
  total: number
  errors: ProcessingError[]
}

export interface ProcessingError {
  elementId: string
  field: string
  value: unknown
  error: Error
}

const defaultOptions: Required<ProcessingOptions> = {
  batchSize: 50,
  onProgress: () => {},
  defaultValues: {},
  cacheSize: 1000
}

// LRU Cache for transformed values
class ValueCache {
  private cache = new Map<string, ParameterValue>()
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: string): ParameterValue | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to front (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: ParameterValue): void {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }
}

// Basic type validation
function validateParameterValue(value: unknown, param: Parameter): boolean {
  if (value === null || value === undefined) return true
  if (isEquationValue(value)) {
    return param.kind === 'user' // Only user parameters can have equations
  }

  switch (param.type) {
    case 'string':
      return true // All values can be converted to strings
    case 'number':
      if (typeof value === 'boolean') return true
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (trimmed.endsWith('%') || trimmed.startsWith('$')) {
          return !isNaN(parseFloat(trimmed.replace(/[%$]/g, '')))
        }
        return !isNaN(parseFloat(trimmed))
      }
      return typeof value === 'number' && !isNaN(value)
    case 'boolean':
      if (typeof value === 'string') {
        const lower = value.toLowerCase().trim()
        return ['true', 'false', 'yes', 'no', '1', '0', 'on', 'off'].includes(lower)
      }
      return typeof value === 'boolean' || typeof value === 'number'
    default:
      return false
  }
}

// Process parameters for multiple elements
export async function processElementParameters(
  elements: ElementData[],
  parameters: Parameter[],
  options: ProcessingOptions = {}
): Promise<TableRow[]> {
  if (!Array.isArray(elements) || !Array.isArray(parameters)) {
    debug.error(DebugCategories.PARAMETERS, 'Invalid input:', {
      elements: Array.isArray(elements),
      parameters: Array.isArray(parameters)
    })
    return []
  }

  const opts = { ...defaultOptions, ...options }
  const batches = chunk(elements, opts.batchSize)
  const result: TableRow[] = []
  const errors: ProcessingError[] = []
  let processed = 0
  const cache = new ValueCache(opts.cacheSize)

  debug.log(DebugCategories.PARAMETERS, 'Starting parameter processing', {
    elementCount: elements.length,
    parameterCount: parameters.length,
    options: opts
  })

  try {
    for (const batch of batches) {
      await new Promise((resolve) => setTimeout(resolve, 0)) // Yield to event loop

      const batchResults = await Promise.all(
        batch.map((element) =>
          processElement(element, parameters, opts.defaultValues, cache).catch(
            (error) => {
              const processedError: ProcessingError = {
                elementId: element.id,
                field: error instanceof ValidationError ? error.field : 'unknown',
                value: error instanceof ValidationError ? error.value : undefined,
                error: error instanceof Error ? error : new Error(String(error))
              }
              errors.push(processedError)

              // Return element with error state
              return {
                ...element,
                parameters: {
                  _error: createParameterValueState(
                    error instanceof Error ? error.message : String(error)
                  )
                }
              } as TableRow
            }
          )
        )
      )

      result.push(...batchResults)
      processed += batch.length

      opts.onProgress({
        processed,
        total: elements.length,
        errors
      })
    }

    debug.log(DebugCategories.PARAMETERS, 'Parameter processing complete', {
      processedCount: processed,
      errorCount: errors.length,
      resultCount: result.length
    })

    return result
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Parameter processing failed:', error)
    return elements.map((element) => ({
      ...element,
      parameters: {
        _error: createParameterValueState(
          error instanceof Error ? error.message : String(error)
        )
      }
    }))
  }
}

// Process a single element's parameters
async function processElement(
  element: ElementData,
  parameters: Parameter[],
  defaultValues: Record<string, ParameterValue>,
  cache: ValueCache
): Promise<TableRow> {
  if (!element || typeof element !== 'object') {
    throw new Error('Invalid element data')
  }

  const processedParams: Record<string, ParameterValue> = {}

  // Ensure parameters object exists
  const elementParams: Record<string, unknown> =
    (element.parameters as Record<string, unknown>) || {}

  for (const param of parameters) {
    try {
      const value = elementParams[param.field]

      // Handle undefined/null values
      if (value === undefined || value === null) {
        // Use default value if available
        if (param.field in defaultValues) {
          processedParams[param.field] = defaultValues[param.field]
        } else {
          // Create empty state based on parameter type
          processedParams[param.field] =
            param.type === 'string' ? '' : param.type === 'number' ? 0 : false
        }
        continue
      }

      // Check cache first
      const cacheKey = `${param.field}:${JSON.stringify(value)}`
      const cachedValue = cache.get(cacheKey)
      if (cachedValue !== undefined) {
        processedParams[param.field] = cachedValue
        continue
      }

      // Validate and transform the value
      if (!validateParameterValue(value, param)) {
        debug.warn(DebugCategories.PARAMETERS, 'Parameter validation failed:', {
          field: param.field,
          value,
          type: param.type
        })
        throw new ValidationError(param.field, value, 'Parameter validation failed')
      }

      const transformedValue = await transformValue(value, param)
      cache.set(cacheKey, transformedValue)
      processedParams[param.field] = transformedValue
    } catch (error) {
      debug.error(DebugCategories.PARAMETERS, 'Parameter processing error:', {
        elementId: element.id,
        field: param.field,
        error
      })

      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError(
        param.field,
        elementParams[param.field],
        `Processing failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return {
    ...element,
    parameters: processedParams
  }
}

// Transform a value according to its parameter type
async function transformValue(
  value: unknown,
  parameter: Parameter
): Promise<ParameterValue> {
  // Yield to event loop for complex transformations
  await new Promise((resolve) => setTimeout(resolve, 0))

  try {
    // Handle equation values for user parameters
    if (isEquationValue(value) && isUserParameter(parameter)) {
      return value
    }

    // Handle primitive value transformations
    switch (parameter.type) {
      case 'string': {
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value).trim()
      }

      case 'number': {
        if (value === null || value === undefined) return 0
        if (typeof value === 'boolean') return value ? 1 : 0
        if (typeof value === 'string') {
          const trimmed = value.trim()
          // Handle percentage strings
          if (trimmed.endsWith('%')) {
            const num = parseFloat(trimmed)
            return isNaN(num) ? 0 : num / 100
          }
          // Handle currency strings
          if (trimmed.startsWith('$')) {
            const num = parseFloat(trimmed.substring(1))
            return isNaN(num) ? 0 : num
          }
          // Handle other numeric strings
          const num = parseFloat(trimmed)
          return isNaN(num) ? 0 : num
        }
        const num = Number(value)
        return isNaN(num) ? 0 : num
      }

      case 'boolean': {
        if (value === null || value === undefined) return false
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          if (['true', 'yes', '1', 'on'].includes(lower)) return true
          if (['false', 'no', '0', 'off'].includes(lower)) return false
          return false
        }
        return Boolean(value)
      }

      default:
        debug.error(DebugCategories.PARAMETERS, 'Unsupported parameter type:', {
          type: parameter.type,
          value
        })
        throw new ValidationError(
          parameter.field,
          value,
          `Unsupported parameter type: ${parameter.type}`
        )
    }
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Value transformation failed:', {
      value,
      type: parameter.type,
      error
    })
    throw error
  }
}

// Helper function to chunk array
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
