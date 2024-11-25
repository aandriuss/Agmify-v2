import { ref } from 'vue'
import type { Ref } from 'vue'
import type { TreeItemComponentModel, ProcessedHeader, BIMNodeRaw } from '../types'
import { debug, DebugCategories } from '../debug/useDebug'
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
    if (!isValidTreeItemComponentModel(element)) {
      debug.warn(DebugCategories.PARAMETERS, 'Invalid tree item model', {
        element: typeof element === 'object' ? element : 'not an object'
      })
      return
    }

    // Add the element itself if it has raw data
    if (element.rawNode?.raw) {
      elements.push(element)
    }

    // Process children if they exist
    if (isValidArray(element.children)) {
      element.children.forEach((child) => {
        if (isValidTreeItemComponentModel(child)) {
          processNode(child)
        }
      })
    }
  }

  processNode(node)

  debug.log(DebugCategories.PARAMETERS, 'Found elements', {
    totalCount: elements.length,
    sampleElements: elements.slice(0, 3).map((e) => ({
      id: e.rawNode?.raw?.id,
      type: e.rawNode?.raw?.type,
      category: e.rawNode?.raw?.Other?.Category,
      hasParameters: !!e.rawNode?.raw?.parameters,
      parameterCount: e.rawNode?.raw?.parameters
        ? Object.keys(e.rawNode.raw.parameters).length
        : 0
    }))
  })

  return elements
}

// Process parameters from element
function processElementParameters(
  raw: BIMNodeRaw,
  category: string
): ProcessedHeader[] {
  const parameters: ProcessedHeader[] = []
  const processedFields = new Set<string>()
  const parametersByGroup = new Map<string, number>()

  // Helper to add parameter
  const addParameter = (key: string, value: unknown, group: string) => {
    const paramKey = key.replace(/\s+/g, '_').toLowerCase()
    if (!processedFields.has(paramKey)) {
      const param: ProcessedHeader = {
        field: paramKey,
        header: key,
        type: typeof value === 'number' ? 'number' : 'string',
        source: group,
        category: category || 'Uncategorized',
        description: `${group} > ${key}`,
        isFetched: true,
        fetchedGroup: group,
        currentGroup: group
      }

      parameters.push(param)
      processedFields.add(paramKey)

      // Track parameters by group
      parametersByGroup.set(group, (parametersByGroup.get(group) || 0) + 1)

      debug.log(DebugCategories.PARAMETERS, 'Parameter discovered', {
        field: paramKey,
        header: key,
        group,
        category,
        type: param.type,
        value
      })
    }
  }

  debug.log(DebugCategories.PARAMETERS, 'Processing element', {
    type: raw.type,
    category,
    hasParameters: !!raw.parameters,
    topLevelKeys: Object.keys(raw)
  })

  // Process standard parameters
  if (raw.parameters && typeof raw.parameters === 'object') {
    Object.entries(raw.parameters).forEach(([key, value]) => {
      addParameter(key, value, 'Parameters')
    })
  }

  // Process known parameter groups
  const knownGroups = [
    'BaseQuantities',
    'Constraints',
    'Dimensions',
    'Identity Data',
    'Other',
    'Phasing',
    'Structural'
  ]

  knownGroups.forEach((group) => {
    const groupData = raw[group]
    if (groupData && typeof groupData === 'object') {
      Object.entries(groupData as Record<string, unknown>).forEach(([key, value]) => {
        addParameter(key, value, group)
      })
    }
  })

  // Process Pset_ parameters
  Object.entries(raw).forEach(([key, value]) => {
    if (key.startsWith('Pset_') && typeof value === 'object' && value) {
      Object.entries(value as Record<string, unknown>).forEach(([subKey, subValue]) => {
        addParameter(subKey, subValue, key)
      })
    }
  })

  // Process any remaining top-level properties
  Object.entries(raw).forEach(([key, value]) => {
    if (
      !knownGroups.includes(key) &&
      !key.startsWith('Pset_') &&
      key !== 'parameters' &&
      key !== 'id' &&
      key !== 'speckleType' &&
      key !== 'type' &&
      key !== '_type' &&
      key !== 'elements' &&
      key !== 'children'
    ) {
      if (typeof value !== 'object' || value === null) {
        addParameter(key, value, 'Properties')
      }
    }
  })

  debug.log(DebugCategories.PARAMETERS, 'Element parameters processed', {
    elementType: raw.type,
    category,
    totalParameters: parameters.length,
    parametersByGroup: Object.fromEntries(parametersByGroup),
    sampleParameters: parameters.slice(0, 3).map((p) => ({
      field: p.field,
      type: p.type,
      source: p.source,
      category: p.category
    }))
  })

  return parameters
}

// Get element category
function getElementCategory(raw: BIMNodeRaw): string {
  return (
    convertToString(raw.Other?.Category) || convertToString(raw.type) || 'Uncategorized'
  )
}

// Discover parameters for elements
async function discoverParametersForElements(
  elements: TreeItemComponentModel[],
  selectedCategories: string[]
): Promise<ProcessedHeader[]> {
  const parameters = new Map<string, ProcessedHeader>()
  const CHUNK_SIZE = 50 // Process 50 elements at a time

  debug.log(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
    elementCount: elements.length,
    selectedCategories,
    chunkSize: CHUNK_SIZE,
    elementTypes: [
      ...new Set(
        elements
          .map((e) => e.rawNode?.raw?.type)
          .filter((type): type is string => !!type)
      )
    ]
  })

  // Process all elements if no categories selected
  const elementsToProcess = selectedCategories.length
    ? elements.filter((element) => {
        if (!element.rawNode?.raw) {
          return false
        }

        const category = getElementCategory(element.rawNode.raw)
        const shouldProcess = selectedCategories.includes(category)

        debug.log(DebugCategories.PARAMETERS, 'Filtering element by category', {
          elementType: element.rawNode.raw.type,
          elementCategory: category,
          selectedCategories,
          shouldProcess
        })

        return shouldProcess
      })
    : elements

  debug.log(DebugCategories.PARAMETERS, 'Processing elements for parameters', {
    totalElements: elements.length,
    selectedCategories,
    elementsToProcess: elementsToProcess.length,
    elementCategories: elementsToProcess
      .map((e) => e.rawNode?.raw)
      .filter((raw): raw is BIMNodeRaw => !!raw)
      .map(getElementCategory),
    chunkSize: CHUNK_SIZE
  })

  // Process elements in chunks
  for (let i = 0; i < elementsToProcess.length; i += CHUNK_SIZE) {
    const chunk = elementsToProcess.slice(i, i + CHUNK_SIZE)

    // Process chunk
    chunk.forEach((element) => {
      if (!element.rawNode?.raw) {
        return
      }

      const raw = element.rawNode.raw
      const category = getElementCategory(raw)

      // Process parameters from raw data
      const elementParams = processElementParameters(raw, category)
      elementParams.forEach((param) => {
        if (!parameters.has(param.field)) {
          parameters.set(param.field, param)
        }
      })
    })

    // Log progress
    if ((i + CHUNK_SIZE) % 200 === 0 || i + CHUNK_SIZE >= elementsToProcess.length) {
      debug.log(DebugCategories.PARAMETERS, 'Parameter discovery progress', {
        processed: Math.min(i + CHUNK_SIZE, elementsToProcess.length),
        total: elementsToProcess.length,
        discoveredParameters: parameters.size,
        parameterGroups: [
          ...new Set(Array.from(parameters.values()).map((p) => p.source))
        ],
        sampleParameters: Array.from(parameters.values())
          .slice(0, 3)
          .map((p) => ({
            field: p.field,
            type: p.type,
            source: p.source,
            category: p.category
          }))
      })
    }

    // Allow other operations to run between chunks
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  const result = Array.from(parameters.values())

  debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
    totalParameters: result.length,
    parameterGroups: [...new Set(result.map((h) => h.fetchedGroup))],
    categories: [...new Set(result.map((h) => h.category))],
    parametersByGroup: Object.fromEntries(
      Array.from(
        result.reduce((acc, param) => {
          const group = param.source
          acc.set(group, (acc.get(group) || 0) + 1)
          return acc
        }, new Map<string, number>())
      )
    ),
    sampleParameters: result.slice(0, 5).map((p) => ({
      field: p.field,
      type: p.type,
      source: p.source,
      category: p.category,
      fetchedGroup: p.fetchedGroup
    }))
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
      debug.startState(DebugCategories.PARAMETERS, 'Starting parameter discovery', {
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value,
        rootNode: {
          hasRawNode: !!rootNode.rawNode,
          hasChildren: !!rootNode.children?.length,
          rawType: rootNode.rawNode?.raw?.type
        }
      })

      // Find all elements first
      const allElements = findAllElements(rootNode)

      debug.log(DebugCategories.PARAMETERS, 'Found elements', {
        totalCount: allElements.length,
        categories: [
          ...new Set(
            allElements
              .map((e) => e.rawNode?.raw)
              .filter((raw): raw is BIMNodeRaw => !!raw)
              .map(getElementCategory)
          )
        ],
        elementTypes: [
          ...new Set(
            allElements
              .map((e) => e.rawNode?.raw?.type)
              .filter((type): type is string => !!type)
          )
        ],
        sampleElement: allElements[0]?.rawNode?.raw
      })

      // Discover parameters for parent and child categories
      const [parentHeaders, childHeaders] = await Promise.all([
        discoverParametersForElements(allElements, selectedParentCategories.value),
        discoverParametersForElements(allElements, selectedChildCategories.value)
      ])

      debug.log(DebugCategories.PARAMETERS, 'Parameters discovered', {
        parentCount: parentHeaders.length,
        childCount: childHeaders.length,
        parentHeaders: parentHeaders.map((h) => ({
          field: h.field,
          header: h.header,
          group: h.fetchedGroup,
          source: h.source,
          category: h.category
        })),
        childHeaders: childHeaders.map((h) => ({
          field: h.field,
          header: h.header,
          group: h.fetchedGroup,
          source: h.source,
          category: h.category
        }))
      })

      // Update refs
      availableParentHeaders.value = parentHeaders
      availableChildHeaders.value = childHeaders

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
        parentHeaderCount: parentHeaders.length,
        childHeaderCount: childHeaders.length,
        parentGroups: [...new Set(parentHeaders.map((h) => h.fetchedGroup))],
        childGroups: [...new Set(childHeaders.map((h) => h.fetchedGroup))],
        sampleParentHeaders: parentHeaders.slice(0, 3).map((h) => ({
          field: h.field,
          type: h.type,
          source: h.source,
          category: h.category,
          fetchedGroup: h.fetchedGroup
        })),
        sampleChildHeaders: childHeaders.slice(0, 3).map((h) => ({
          field: h.field,
          type: h.type,
          source: h.source,
          category: h.category,
          fetchedGroup: h.fetchedGroup
        }))
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
