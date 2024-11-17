import type { ElementData, ParameterValueType } from '../../types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'
import { debug, DebugCategories } from '../../utils/debug'

// Parameter discovery interface
export interface DiscoveredParameter {
  field: string
  name: string
  type: ParameterValueType
  header: string
  category: string
  frequency: number
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
): Promise<ParameterDefinition[]> {
  debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
    elementCount: elements.length,
    options
  })

  try {
    const opts = { ...defaultOptions, ...options }
    const sample = await getSampleElements(elements, opts.sampleSize)
    const discovered = await analyzeParameters(sample, opts.batchSize)
    const filtered = await filterParameters(discovered, opts)
    const definitions = convertToDefinitions(filtered)

    debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
      discoveredCount: definitions.length
    })

    return definitions
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Parameter discovery failed:', error)
    throw error
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
      for (const [field, value] of Object.entries(element.parameters || {})) {
        const current = discovered.get(field) || {
          field,
          name: field,
          header: field,
          type: inferType(value),
          category: 'Custom Parameters',
          frequency: 0
        }
        current.frequency++
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

// Convert discovered parameters to definitions
function convertToDefinitions(
  discovered: DiscoveredParameter[]
): ParameterDefinition[] {
  return discovered.map((param) => ({
    field: param.field,
    name: param.name,
    header: param.header,
    type: param.type,
    category: param.category,
    removable: true,
    visible: true
  }))
}

// Infer parameter type from value
function inferType(value: unknown): ParameterValueType {
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
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
