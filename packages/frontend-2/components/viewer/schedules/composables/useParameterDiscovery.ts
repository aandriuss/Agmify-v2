import { ref } from 'vue'
import type { Ref } from 'vue'
import type { TreeItemComponentModel, ProcessedHeader, BIMNodeRaw } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { getAllGroupParameters } from '../config/parameters'
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
  availableParentHeaders: Ref<ProcessedHeader[]>
  availableChildHeaders: Ref<ProcessedHeader[]>
  discoverParameters: (rootNode: TreeItemComponentModel) => Promise<void>
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

  // Get all parameters grouped by their source
  const groupedParams = getAllGroupParameters(raw)

  // Process each group
  Object.entries(groupedParams).forEach(([group, params]) => {
    Object.entries(params).forEach(([key, value]) => {
      const paramKey = key.replace(/\s+/g, '_').toLowerCase()
      if (
        !processedFields.has(paramKey) &&
        (typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean')
      ) {
        headers.push({
          field: paramKey,
          header: key,
          fetchedGroup: group,
          currentGroup: group,
          source: group, // Set source same as group
          type: typeof value as 'string' | 'number' | 'boolean',
          category,
          description: `${group} > ${key}`,
          isFetched: true
        })
        processedFields.add(paramKey)

        debug.log(DebugCategories.PARAMETERS, 'Discovered parameter', {
          field: paramKey,
          header: key,
          group,
          category,
          type: typeof value,
          value
        })
      }
    })
  })

  return headers
}

// Discover parameters for elements
async function discoverParametersForElements(
  elements: TreeItemComponentModel[],
  selectedCategories: string[]
): Promise<ProcessedHeader[]> {
  const headers = new Map<string, ProcessedHeader>()

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
    parameterGroups: [...new Set(result.map((h) => h.fetchedGroup))],
    parametersByGroup: result.reduce((acc, header) => {
      const group = header.fetchedGroup
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

  const availableParentHeaders = ref<ProcessedHeader[]>([])
  const availableChildHeaders = ref<ProcessedHeader[]>([])

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
        availableParentHeaders.value = []
        availableChildHeaders.value = []
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

      availableParentHeaders.value = parentHeaders
      availableChildHeaders.value = childHeaders

      debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
        parentHeaderCount: parentHeaders.length,
        childHeaderCount: childHeaders.length,
        parentGroups: [...new Set(parentHeaders.map((h) => h.fetchedGroup))],
        childGroups: [...new Set(childHeaders.map((h) => h.fetchedGroup))]
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
    availableParentHeaders,
    availableChildHeaders,
    discoverParameters
  }
}
