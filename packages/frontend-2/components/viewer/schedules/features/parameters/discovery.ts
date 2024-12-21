import type { ElementData, BIMNodeRaw, PrimitiveValue } from '~/composables/core/types'
import type { BimValueType } from '~/composables/core/types/parameters'
import type { AvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { getParameterGroup } from '../../config/parameters'
import { createAvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'

// Parameter discovery interface
export interface DiscoveredParameter {
  field: string
  name: string
  type: BimValueType
  header: string
  category: string // Element category
  group: string // Parameter group from raw data
  description: string
  visible: boolean
  frequency: number
  sourceValue: PrimitiveValue
}

// Parameter discovery options
export interface DiscoveryOptions {
  sampleSize?: number
  minFrequency?: number
  excludeParams?: Set<string>
  batchSize?: number
}

const defaultOptions: Required<DiscoveryOptions> = {
  sampleSize: 100,
  minFrequency: 0.1,
  excludeParams: new Set(),
  batchSize: 20
}

// Discover parameters from element data
export async function discoverParameters(
  elements: ElementData[],
  options: DiscoveryOptions = {}
): Promise<AvailableBimParameter[]> {
  debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
    elementCount: elements.length,
    options
  })

  try {
    const opts = { ...defaultOptions, ...options }
    const sample = await getSampleElements(elements, opts.sampleSize)
    const discovered = await analyzeParameters(sample, opts.batchSize)
    const filtered = await filterParameters(discovered, opts)
    const parameters = convertToParameters(filtered)

    debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
      discoveredCount: parameters.length,
      groups: [...new Set(parameters.map((p) => p.currentGroup))],
      parameterGroups: [...new Set(filtered.map((p) => p.group))]
    })

    return parameters
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Parameter discovery failed:', error)
    throw new Error(
      `Parameter discovery failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

// Get a representative sample of elements
async function getSampleElements(
  elements: ElementData[],
  sampleSize: number
): Promise<ElementData[]> {
  await new Promise((resolve) => setTimeout(resolve, 0)) // Yield to event loop

  if (elements.length <= sampleSize) return elements
  const indices = new Set<number>()
  while (indices.size < sampleSize) {
    indices.add(Math.floor(Math.random() * elements.length))
  }
  return Array.from(indices).map((i) => elements[i])
}

// Convert unknown value to primitive value
function toPrimitiveValue(value: unknown): PrimitiveValue {
  if (value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' && !isNaN(value)) return value
  if (typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

// Analyze parameters across elements in batches
async function analyzeParameters(
  elements: ElementData[],
  batchSize: number
): Promise<Map<string, DiscoveredParameter>> {
  debug.log(DebugCategories.PARAMETERS, 'Analyzing parameters', {
    elementCount: elements.length,
    batchSize
  })

  const discovered = new Map<string, DiscoveredParameter>()
  const batches = chunk(elements, batchSize)

  for (const batch of batches) {
    await new Promise((resolve) => setTimeout(resolve, 0)) // Yield to event loop

    for (const element of batch) {
      const params = (element.parameters || {}) as Record<string, unknown>
      const groups =
        (Object.getOwnPropertyDescriptor(params, '_groups')?.value as Record<
          string,
          string
        >) || {}

      // Get raw data for parameter group determination
      const rawData = Object.getOwnPropertyDescriptor(element, '_raw')?.value as
        | BIMNodeRaw
        | undefined

      for (const [field, value] of Object.entries(params)) {
        if (field === '_groups') continue

        // Use group from raw data, or get it from parameter location
        const paramGroup =
          groups[field] || (rawData ? getParameterGroup(field, rawData) : 'Parameters')

        const current = discovered.get(field) || {
          field,
          name: field,
          header: field,
          type: inferType(value),
          category: element.category || 'Parameters', // Element category
          group: paramGroup, // Parameter group
          description: `${paramGroup} > ${field}`,
          visible: true, // Default visible
          frequency: 0,
          sourceValue: toPrimitiveValue(value)
        }

        // Update frequency and merge any new information
        current.frequency++
        if (!current.group && paramGroup) {
          current.group = paramGroup
          current.description = `${paramGroup} > ${field}`
        }

        discovered.set(field, current)
      }
    }
  }

  // Convert frequencies to percentages
  for (const param of discovered.values()) {
    param.frequency = param.frequency / elements.length
  }

  return discovered
}

// Filter parameters based on options
async function filterParameters(
  discovered: Map<string, DiscoveredParameter>,
  options: Required<DiscoveryOptions>
): Promise<DiscoveredParameter[]> {
  await new Promise((resolve) => setTimeout(resolve, 0)) // Yield to event loop

  return Array.from(discovered.values()).filter(
    (param) =>
      param.frequency >= options.minFrequency && !options.excludeParams.has(param.field)
  )
}

// Convert discovered parameters to BimParameters
function convertToParameters(
  discovered: DiscoveredParameter[]
): AvailableBimParameter[] {
  return discovered.map((param) =>
    createAvailableBimParameter(
      {
        id: param.field,
        name: param.name,
        value: param.sourceValue,
        sourceGroup: param.group,
        metadata: {}
      },
      param.type,
      param.sourceValue
    )
  )
}

// Infer parameter type from value
function inferType(value: unknown): BimValueType {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

// Helper function to chunk array
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}
