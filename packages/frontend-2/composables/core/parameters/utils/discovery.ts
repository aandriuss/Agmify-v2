import type { PrimitiveValue, ParameterValue } from '~/composables/core/types'
import type { BimValueType } from '~/composables/core/types/parameters'
import type { AvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import type {
  ParameterGroup,
  GroupedParameter
} from '~/composables/core/types/parameters/parameter-groups'
import type { BIMNodeData } from '~/composables/core/types/viewer/viewer-base'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { createAvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import type { ExtractedParameter } from '~/composables/core/parameters/utils/parameter-extraction'
import {
  extractRawParameters,
  extractParameterGroups
} from '~/composables/core/parameters/utils/parameter-extraction'

// Parameter discovery interface
export interface DiscoveredParameter extends GroupedParameter {
  frequency: number
  sourceValue: PrimitiveValue
}

// Parameter discovery options
export interface DiscoveryOptions {
  sampleSize?: number
  minFrequency?: number
  excludeParams?: Set<string>
  batchSize?: number
  userGroups?: ParameterGroup[] // Allow user-defined groups
}

const defaultOptions: Required<DiscoveryOptions> = {
  sampleSize: 100,
  minFrequency: 0.1,
  excludeParams: new Set(),
  batchSize: 20,
  userGroups: []
}

// Discover parameters from element data with group handling
export async function discoverParameters(
  elements: BIMNodeData[],
  options: DiscoveryOptions = {}
): Promise<AvailableBimParameter[]> {
  debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
    elementCount: elements.length,
    options
  })

  try {
    const opts = { ...defaultOptions, ...options }
    const sample = await getSampleElements(elements, opts.sampleSize)

    // Extract parameters and groups
    const rawParams = extractRawParameters(sample)
    const groups = extractParameterGroups(sample)

    // Process parameters with group information
    const discovered = await analyzeGroupedParameters(rawParams, opts.batchSize)
    const filtered = await filterParameters(discovered, opts)
    const parameters = convertToParameters(filtered, groups)

    debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
      discoveredCount: parameters.length,
      groups: groups.map((g: ParameterGroup) => g.name),
      parameters: parameters.length
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
  elements: BIMNodeData[],
  sampleSize: number
): Promise<BIMNodeData[]> {
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

// Analyze grouped parameters across elements in batches
async function analyzeGroupedParameters(
  parameters: ExtractedParameter[],
  batchSize: number
): Promise<Map<string, DiscoveredParameter>> {
  debug.log(DebugCategories.PARAMETERS, 'Analyzing grouped parameters', {
    parameterCount: parameters.length,
    batchSize
  })

  const discovered = new Map<string, DiscoveredParameter>()
  const batches = chunk(parameters, batchSize)

  for (const batch of batches) {
    await new Promise((resolve) => setTimeout(resolve, 0)) // Yield to event loop

    for (const param of batch) {
      const paramValue = param.value as ParameterValue
      const nameParts = param.name.split('.')
      const group = nameParts.length > 1 ? nameParts[0] : param.group
      const name = nameParts.length > 1 ? nameParts.slice(1).join('.') : param.name

      const current: DiscoveredParameter = discovered.get(param.id) || {
        ...param,
        name,
        value: paramValue,
        frequency: 0,
        sourceValue: toPrimitiveValue(paramValue),
        groupId: group ? `bim_${group}` : '',
        kind: 'bim',
        type: inferType(paramValue),
        fetchedGroup: group || 'Parameters',
        currentGroup: group || 'Parameters',
        originalGroup: group,
        isSystem: group?.startsWith('__') || false,
        metadata: {
          ...param.metadata,
          displayName: name,
          originalGroup: group
        }
      }

      // Update frequency
      current.frequency++
      discovered.set(param.id, current)
    }
  }

  // Convert frequencies to percentages
  const totalCount = parameters.length
  for (const param of discovered.values()) {
    param.frequency = param.frequency / totalCount
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
      param.frequency >= options.minFrequency && !options.excludeParams.has(param.id)
  )
}

// Convert discovered parameters to BimParameters with group information
function convertToParameters(
  discovered: DiscoveredParameter[],
  groups: ParameterGroup[]
): AvailableBimParameter[] {
  const groupMap = new Map(groups.map((g) => [g.id, g]))

  return discovered.map((param) => {
    const group = param.groupId ? groupMap.get(param.groupId) : undefined
    const nameParts = param.name.split('.')
    const cleanName = nameParts.length > 1 ? nameParts.slice(1).join('.') : param.name

    return createAvailableBimParameter(
      {
        id: param.id,
        name: cleanName,
        value: param.sourceValue,
        fetchedGroup: group?.name || param.originalGroup || 'Parameters',
        metadata: {
          ...param.metadata,
          groupId: param.groupId,
          originalGroup: param.originalGroup,
          displayName: cleanName
        }
      },
      inferType(param.value),
      param.sourceValue
    )
  })
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
