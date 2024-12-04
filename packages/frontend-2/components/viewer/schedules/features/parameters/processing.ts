import type {
  ElementData,
  ParameterValue,
  TableRow,
  ParameterValueState,
  Parameters
} from '~/composables/core/types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'
import { debug, DebugCategories } from '../../debug/useDebug'
import { createParameterValueState } from '~/composables/core/types'

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
function validateParameterValue(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':
      return (
        value === null ||
        value === undefined ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'object'
      )
    case 'number':
      if (value === null || value === undefined) return true
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
      if (value === null || value === undefined) return true
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
  definitions: ParameterDefinition[],
  options: ProcessingOptions = {}
): Promise<TableRow[]> {
  const opts = { ...defaultOptions, ...options }
  const batches = chunk(elements, opts.batchSize)
  const result: TableRow[] = []
  const errors: ProcessingError[] = []
  let processed = 0
  const cache = new ValueCache(opts.cacheSize)

  debug.log(DebugCategories.PARAMETERS, 'Starting parameter processing', {
    elementCount: elements.length,
    definitionCount: definitions.length,
    options: opts
  })

  try {
    for (const batch of batches) {
      await new Promise((resolve) => setTimeout(resolve, 0)) // Yield to event loop

      const batchResults = await Promise.all(
        batch.map((element) =>
          processElement(element, definitions, opts.defaultValues, cache).catch(
            (error) => {
              const processedError: ProcessingError = {
                elementId: element.id,
                field: error instanceof ValidationError ? error.field : 'unknown',
                value: error instanceof ValidationError ? error.value : undefined,
                error: error instanceof Error ? error : new Error(String(error))
              }
              errors.push(processedError)

              // Return partial data on error
              const errorParams: Parameters = {
                _error: createParameterValueState(
                  error instanceof Error ? error.message : String(error)
                )
              }

              return {
                ...element,
                parameters: errorParams
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
      errorCount: errors.length
    })

    return result
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Parameter processing failed:', error)
    throw error
  }
}

// Process a single element's parameters
async function processElement(
  element: ElementData,
  definitions: ParameterDefinition[],
  defaultValues: Record<string, ParameterValue>,
  cache: ValueCache
): Promise<TableRow> {
  const processedParams: Record<string, ParameterValueState> = {}

  for (const def of definitions) {
    try {
      const value = element.parameters?.[def.field]

      if (value === undefined) {
        // Use default value if available
        if (def.field in defaultValues) {
          processedParams[def.field] = createParameterValueState(
            defaultValues[def.field]
          )
          continue
        }
        // Skip undefined parameters
        continue
      }

      // Check cache first
      const cacheKey = `${def.field}:${JSON.stringify(value)}`
      const cachedValue = cache.get(cacheKey)
      if (cachedValue !== undefined) {
        processedParams[def.field] = createParameterValueState(cachedValue)
        continue
      }

      // Validate and transform the value
      if (!validateParameterValue(value, def.type)) {
        throw new ValidationError(def.field, value, 'Parameter validation failed')
      }

      const transformedValue = await transformValue(value, def)
      cache.set(cacheKey, transformedValue)
      processedParams[def.field] = createParameterValueState(transformedValue)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new ValidationError(
        def.field,
        element.parameters?.[def.field],
        `Processing failed: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  return {
    ...element,
    parameters: processedParams
  }
}

// Transform a value according to its parameter definition
async function transformValue(
  value: unknown,
  definition: ParameterDefinition
): Promise<ParameterValue> {
  // Yield to event loop for complex transformations
  await new Promise((resolve) => setTimeout(resolve, 0))

  try {
    switch (definition.type) {
      case 'string': {
        if (value === null || value === undefined) return ''
        if (typeof value === 'object') return JSON.stringify(value)
        return String(value).trim()
      }

      case 'number': {
        if (value === null || value === undefined) return 0
        if (typeof value === 'boolean') return value ? 1 : 0
        if (typeof value === 'string') {
          // Handle percentage strings
          if (value.endsWith('%')) {
            return parseFloat(value) / 100
          }
          // Handle currency strings
          if (value.startsWith('$')) {
            return parseFloat(value.substring(1))
          }
          // Handle other numeric strings
          const num = parseFloat(value)
          if (!isNaN(num)) return num
        }
        const num = Number(value)
        if (isNaN(num)) {
          throw new ValidationError(definition.field, value, 'Invalid number value')
        }
        return num
      }

      case 'boolean': {
        if (value === null || value === undefined) return false
        if (typeof value === 'string') {
          const lower = value.toLowerCase().trim()
          if (['true', 'yes', '1', 'on'].includes(lower)) return true
          if (['false', 'no', '0', 'off'].includes(lower)) return false
        }
        return Boolean(value)
      }

      default:
        throw new ValidationError(
          definition.field,
          value,
          `Unsupported parameter type: ${definition.type}`
        )
    }
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Value transformation failed:', {
      value,
      type: definition.type,
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
