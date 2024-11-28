import type {
  ElementData,
  ProcessedData,
  DisplayData,
  ParameterDefinition,
  ParameterValue
} from '../types/'
import { ValidationError } from '../types/'

// Data filtering
export function filterData(
  data: ElementData[],
  categories: Set<string>
): ElementData[] {
  return data.filter((element) => categories.has(element.category))
}

// Parameter processing
export function processParameters(
  data: ElementData[],
  definitions: ParameterDefinition[]
): ProcessedData[] {
  return data.map((element) => ({
    ...element,
    parameters: processElementParameters(element.parameters, definitions)
  }))
}

function processElementParameters(
  parameters: Record<string, unknown>,
  definitions: ParameterDefinition[]
): Record<string, ParameterValue> {
  const processed: Record<string, ParameterValue> = {}

  for (const def of definitions) {
    const value = parameters[def.id]
    if (value !== undefined) {
      try {
        if (def.validation(value)) {
          processed[def.id] = transformValue(value, def.type)
        }
      } catch (error) {
        throw new ValidationError(def.id, value, `Error processing parameter: ${error}`)
      }
    }
  }

  return processed
}

// Value transformation
export function transformValue(
  value: unknown,
  type: ParameterDefinition['type']
): ParameterValue {
  switch (type) {
    case 'string':
      return String(value)
    case 'number': {
      const num = Number(value)
      if (isNaN(num)) throw new Error(`Invalid number value: ${value}`)
      return num
    }
    case 'boolean':
      return Boolean(value)
    case 'date': {
      const date = new Date(value as string | number)
      if (isNaN(date.getTime())) throw new Error(`Invalid date value: ${value}`)
      return date
    }
    default:
      throw new Error(`Unsupported parameter type: ${type}`)
  }
}

// Display transformation
export function transformForDisplay(
  data: ProcessedData[],
  visibleColumns: Set<string>
): DisplayData[] {
  return data.map((item) => ({
    ...item,
    mark: item.id, // Use id as mark for display
    visible: hasVisibleParameters(item.parameters, visibleColumns),
    selected: false
  }))
}

function hasVisibleParameters(
  parameters: Record<string, ParameterValue>,
  visibleColumns: Set<string>
): boolean {
  return Object.keys(parameters).some((key) => visibleColumns.has(key))
}

// Batch processing
export interface BatchConfig<T> {
  items: T[]
  batchSize?: number
  processItem: (item: T) => Promise<void>
  onBatchComplete?: (info: {
    processed: number
    total: number
    batch: T[]
  }) => Promise<void>
}

export function createBatchProcessor<T>({
  items,
  batchSize = 100,
  processItem,
  onBatchComplete
}: BatchConfig<T>) {
  const batches = chunk(items, batchSize)
  let processed = 0

  return {
    async process() {
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (item) => {
            await processItem(item)
            processed++
          })
        )

        if (onBatchComplete) {
          await onBatchComplete({
            processed,
            total: items.length,
            batch
          })
        }
      }
    }
  }
}

// Array utilities
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// Error handling
export function handleError(error: unknown): ValidationError {
  if (error instanceof Error) {
    return new ValidationError('unknown', error, error.message)
  }
  return new ValidationError('unknown', error, 'Unknown error occurred')
}

// Performance optimization
export function memoize<T, R>(fn: (arg: T) => R): (arg: T) => R {
  const cache = new Map<string, R>()

  return (arg: T) => {
    const key = JSON.stringify(arg)
    if (cache.has(key)) {
      return cache.get(key)!
    }

    const result = fn(arg)
    cache.set(key, result)
    return result
  }
}
