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

// Find elements by category
function findElementsByCategory(
  node: TreeItemComponentModel,
  selectedParentCategories: string[],
  selectedChildCategories: string[]
): {
  parentElements: TreeItemComponentModel[]
  childElements: TreeItemComponentModel[]
} {
  const parentElements: TreeItemComponentModel[] = []
  const childElements: TreeItemComponentModel[] = []

  function processNode(element: TreeItemComponentModel) {
    if (!isValidTreeItemComponentModel(element)) return

    const raw = element.rawNode?.raw
    if (!raw) return

    const category =
      convertToString(raw.Other?.Category) ||
      convertToString(raw.type) ||
      'Uncategorized'

    if (selectedParentCategories.includes(category)) {
      parentElements.push(element)
    }
    if (selectedChildCategories.includes(category)) {
      childElements.push(element)
    }

    if (isValidArray(element.children)) {
      element.children.forEach((child) => {
        if (isValidTreeItemComponentModel(child)) {
          processNode(child)
        }
      })
    }
  }

  processNode(node)
  return { parentElements, childElements }
}

// Discover parameters for specific categories
async function discoverParametersForElements(
  elements: TreeItemComponentModel[]
): Promise<ProcessedHeader[]> {
  const headers = new Map<string, ProcessedHeader>()

  // Process in chunks to avoid blocking
  const chunkSize = 100
  for (let i = 0; i < elements.length; i += chunkSize) {
    const chunk = elements.slice(i, i + chunkSize)
    await new Promise((resolve) => setTimeout(resolve, 0))

    chunk.forEach((element) => {
      const raw = element.rawNode?.raw as BIMNodeRaw | undefined
      if (!raw) return

      const category =
        convertToString(raw.Other?.Category) ||
        convertToString(raw.type) ||
        'Uncategorized'

      // Add basic parameters
      BASIC_PARAMETERS.forEach((param) => {
        const key = `${param.name}:basic`
        if (!headers.has(key)) {
          headers.set(key, {
            field: param.name,
            header: param.name,
            source: 'basic',
            type: 'string',
            category,
            description: `Basic parameter: ${param.name}`
          })
        }
      })

      // Discover additional parameters
      Object.entries(raw).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          Object.entries(value as Record<string, unknown>).forEach(
            ([subKey, subValue]) => {
              if (
                typeof subValue === 'string' ||
                typeof subValue === 'number' ||
                typeof subValue === 'boolean'
              ) {
                const headerKey = `${key}.${subKey}`
                if (!headers.has(headerKey)) {
                  headers.set(headerKey, {
                    field: headerKey,
                    header: subKey,
                    source: key,
                    type: typeof subValue as 'string' | 'number' | 'boolean',
                    category,
                    description: `${key} > ${subKey}`
                  })
                }
              }
            }
          )
        }
      })
    })
  }

  return Array.from(headers.values())
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

      debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery:', {
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      })

      // Find elements by selected categories
      const { parentElements, childElements } = findElementsByCategory(
        rootNode,
        selectedParentCategories.value,
        selectedChildCategories.value
      )

      debug.log(DebugCategories.PARAMETERS, 'Found elements:', {
        parentCount: parentElements.length,
        childCount: childElements.length
      })

      // Discover parameters for each category type
      const [parentHeaders, childHeaders] = await Promise.all([
        discoverParametersForElements(parentElements),
        discoverParametersForElements(childElements)
      ])

      availableHeaders.value = {
        parent: parentHeaders,
        child: childHeaders
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete:', {
        parentHeaderCount: parentHeaders.length,
        childHeaderCount: childHeaders.length
      })
    } catch (error) {
      if (error instanceof ValidationError) {
        debug.error(DebugCategories.ERROR, 'Validation error:', error)
      } else {
        debug.error(DebugCategories.ERROR, 'Error discovering parameters:', error)
      }
      throw error
    }
  }

  return {
    availableHeaders,
    discoverParameters
  }
}
