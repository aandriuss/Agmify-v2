import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  TreeItemComponentModel,
  AvailableHeaders,
  BIMNodeRaw,
  ProcessedHeader
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { BASIC_PARAMETERS } from '../config/parameters'
import { convertToString } from '../utils/dataConversion'
import {
  isValidTreeItemComponentModel,
  isValidArray,
  ValidationError
} from '../utils/validation'

interface ParameterDiscoveryOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

interface ParameterDiscoveryReturn {
  availableHeaders: Ref<AvailableHeaders>
  discoverParameters: (rootNode: TreeItemComponentModel) => Promise<void>
}

interface ParametersWithGroups {
  _groups: Record<string, string>
}

// Find all elements regardless of hierarchy
function findAllElements(node: TreeItemComponentModel): TreeItemComponentModel[] {
  const elements: TreeItemComponentModel[] = []

  function processNode(element: TreeItemComponentModel) {
    if (!isValidTreeItemComponentModel(element)) return

    const raw = element.rawNode?.raw
    if (!raw) return

    elements.push(element)

    if (isValidArray(element.children)) {
      element.children.forEach((child) => {
        if (isValidTreeItemComponentModel(child)) {
          processNode(child)
        }
      })
    }
  }

  processNode(node)
  return elements
}

// Process parameters from element
function processElementParameters(
  raw: BIMNodeRaw,
  category: string
): ProcessedHeader[] {
  const headers: ProcessedHeader[] = []
  const processedFields = new Set<string>()

  function addHeader(
    field: string,
    value: unknown,
    group: string,
    originalName: string = field
  ) {
    const paramKey = field.replace(/\s+/g, '_').toLowerCase()
    if (
      !processedFields.has(paramKey) &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean')
    ) {
      headers.push({
        field: paramKey,
        header: originalName,
        source: group,
        type: typeof value as 'string' | 'number' | 'boolean',
        category,
        description: `${group} > ${originalName}`
      })
      processedFields.add(paramKey)

      debug.log(DebugCategories.PARAMETERS, 'Discovered parameter', {
        field: paramKey,
        header: originalName,
        group,
        category,
        type: typeof value,
        value
      })
    }
  }

  // Process parameters object
  if (raw.parameters && typeof raw.parameters === 'object') {
    const params = raw.parameters as Record<string, unknown>
    const groups = (params._groups || {}) as Record<string, string>

    Object.entries(params).forEach(([key, value]) => {
      if (key !== '_groups' && key !== '_raw') {
        const group = groups[key] || 'Parameters'
        addHeader(key, value, group, key)
      }
    })
  }

  // Process Identity Data
  if (raw['Identity Data'] && typeof raw['Identity Data'] === 'object') {
    Object.entries(raw['Identity Data'] as Record<string, unknown>).forEach(
      ([key, value]) => {
        addHeader(key, value, 'Identity Data', key)
      }
    )
  }

  // Process Constraints
  if (raw.Constraints && typeof raw.Constraints === 'object') {
    Object.entries(raw.Constraints as Record<string, unknown>).forEach(
      ([key, value]) => {
        addHeader(key, value, 'Constraints', key)
      }
    )
  }

  // Process Other
  if (raw.Other && typeof raw.Other === 'object') {
    Object.entries(raw.Other as Record<string, unknown>).forEach(([key, value]) => {
      addHeader(key, value, 'Other', key)
    })
  }

  // Process top-level properties
  Object.entries(raw).forEach(([key, value]) => {
    if (
      ![
        'parameters',
        '_raw',
        '_groups',
        'Identity Data',
        'Constraints',
        'Other'
      ].includes(key) &&
      (typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean')
    ) {
      addHeader(key, value, 'General', key)
    }
  })

  return headers
}

// Discover parameters for elements
async function discoverParametersForElements(
  elements: TreeItemComponentModel[],
  selectedCategories: string[]
): Promise<ProcessedHeader[]> {
  const headers = new Map<string, ProcessedHeader>()

  // Add basic parameters first
  BASIC_PARAMETERS.forEach((param) => {
    const key = param.name.toLowerCase()
    if (!headers.has(key)) {
      headers.set(key, {
        field: key,
        header: param.name,
        source: param.group || 'Basic',
        type: 'string',
        category: 'Basic',
        description: `Basic parameter: ${param.name}`
      })
    }
  })

  // Filter elements by selected categories
  const filteredElements = elements.filter((element) => {
    const raw = element.rawNode?.raw
    if (!raw) return false

    const category =
      convertToString(raw.Other?.Category) ||
      convertToString(raw.type) ||
      'Uncategorized'

    return selectedCategories.includes(category)
  })

  // Process in chunks to avoid blocking
  const chunkSize = 100
  for (let i = 0; i < filteredElements.length; i += chunkSize) {
    const chunk = filteredElements.slice(i, i + chunkSize)
    await new Promise((resolve) => setTimeout(resolve, 0))

    chunk.forEach((element) => {
      const raw = element.rawNode?.raw
      if (!raw) return

      const category =
        convertToString(raw.Other?.Category) ||
        convertToString(raw.type) ||
        'Uncategorized'

      debug.log(DebugCategories.PARAMETERS, 'Processing element parameters', {
        mark: raw.id || 'unknown',
        category,
        parameterCount: raw.parameters ? Object.keys(raw.parameters).length : 0
      })

      // Process parameters from raw data
      const elementHeaders = processElementParameters(raw, category)
      elementHeaders.forEach((header) => {
        if (!headers.has(header.field)) {
          headers.set(header.field, header)
        }
      })
    })
  }

  const result = Array.from(headers.values())

  debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
    totalParameters: result.length,
    parameterGroups: [...new Set(result.map((h) => h.source))],
    parametersByGroup: result.reduce((acc, header) => {
      const group = header.source
      acc[group] = (acc[group] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  })

  return result
}

export function useParameterDiscovery(
  options: ParameterDiscoveryOptions
): ParameterDiscoveryReturn {
  const { selectedParentCategories, selectedChildCategories } = options

  const availableHeaders = ref<AvailableHeaders>({
    parent: [],
    child: []
  })

  async function discoverParameters(rootNode: TreeItemComponentModel): Promise<void> {
    try {
      // Return early if no categories are selected
      if (
        selectedParentCategories.value.length === 0 &&
        selectedChildCategories.value.length === 0
      ) {
        debug.log(
          DebugCategories.PARAMETERS,
          'No categories selected, skipping parameter discovery'
        )
        availableHeaders.value = { parent: [], child: [] }
        return
      }

      debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      })

      // Find all elements first
      const allElements = findAllElements(rootNode)

      debug.log(DebugCategories.PARAMETERS, 'Found elements', {
        totalCount: allElements.length
      })

      // Discover parameters for parent and child categories
      const [parentHeaders, childHeaders] = await Promise.all([
        discoverParametersForElements(allElements, selectedParentCategories.value),
        discoverParametersForElements(allElements, selectedChildCategories.value)
      ])

      availableHeaders.value = {
        parent: parentHeaders,
        child: childHeaders
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
        parentHeaderCount: parentHeaders.length,
        childHeaderCount: childHeaders.length,
        parentGroups: [...new Set(parentHeaders.map((h) => h.source))],
        childGroups: [...new Set(childHeaders.map((h) => h.source))]
      })
    } catch (error) {
      if (error instanceof ValidationError) {
        debug.error(DebugCategories.ERROR, 'Validation error', error)
      } else {
        debug.error(DebugCategories.ERROR, 'Error discovering parameters', error)
      }
      throw error
    }
  }

  return {
    availableHeaders,
    discoverParameters
  }
}
