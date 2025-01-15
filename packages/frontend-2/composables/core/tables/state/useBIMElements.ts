import { ref, computed } from 'vue'
import type {
  ElementData,
  ViewerTree,
  TreeNode,
  ViewerNode,
  ViewerNodeRaw,
  WorldTreeRoot,
  Group,
  ElementParameter
} from '~/composables/core/types'
import { parentCategories } from '~/composables/core/config/categories'
import { getMostSpecificCategory } from '~/composables/core/config/categoryMapping'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { ViewerEvent } from '@speckle/viewer'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import {
  isSpeckleReference,
  isViewerNodeRaw
} from '~/composables/core/types/viewer/viewer-types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { convertToParameterValue } from '~/composables/core/parameters/parameter-processing'
import { createElementParameter } from '~/composables/core/types/parameters/parameter-states'

interface BIMElementsState {
  worldTree: ViewerTree | null
  worldTreeRoot: WorldTreeRoot | null
  treeNodes: TreeNode[]
  elements: ElementData[]
  isLoading: boolean
  error: Error | null
}

interface BIMElementsOptions {
  childCategories?: string[]
}

/**
 * Extract raw parameters from node data with nested property support
 */
interface ExtractedParameter {
  name: string
  value: ParameterValue
  group: Group
}

function extractNodeParameters(
  nodeData: ViewerNodeRaw
): Record<string, ExtractedParameter> {
  // Get 0_Base that should be excluded
  const coreProperties = new Set([
    'id',
    'type',
    'Name',
    'metadata',
    'children',
    'elements',
    'speckle_type',
    'applicationId',
    'renderMaterial'
  ])

  // Extract all properties except core and system ones
  const parameters: Record<string, ExtractedParameter> = {}

  // Process all properties recursively
  function processAllProperties(obj: Record<string, unknown>, basePath: string[] = []) {
    Object.entries(obj).forEach(([key, value]) => {
      const isCore = coreProperties.has(key)
      const isSystem = key.startsWith('__') || key.startsWith('@')

      if (!isCore && !isSystem) {
        // For objects, process recursively
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processAllProperties(value as Record<string, unknown>, [...basePath, key])
        } else {
          // For primitive values, process directly
          const convertedValue = convertToParameterValue(value)
          if (convertedValue !== null) {
            const paramPath = [...basePath, key]
            const paramName = paramPath[paramPath.length - 1]
            const groupPath = paramPath.slice(0, -1)

            parameters[paramName] = {
              name: paramName,
              value: convertedValue,
              group: {
                fetchedGroup: groupPath.length > 0 ? groupPath.join('.') : 'Ungrouped',
                currentGroup: groupPath.length > 0 ? groupPath.join('.') : 'Ungrouped'
              }
            }
          }
        }
      }
    })
  }

  // Start processing from root
  processAllProperties(nodeData)

  // Log extracted parameters for debugging
  if (Object.keys(parameters).length > 0) {
    debug.log(DebugCategories.PARAMETERS, 'Extracted parameters from node', {
      nodeId: nodeData.id,
      parameterCount: Object.keys(parameters).length,
      samples: Object.entries(parameters)
        .slice(0, 5)
        .map(([_key, param]) => ({
          name: param.name,
          group: param.group,
          value: param.value
        }))
    })
  }

  return parameters
}

/**
 * Convert ViewerNode to ElementData format
 */
function convertViewerNodeToElementData(
  node: ViewerNode,
  childCategories: string[] = []
): ElementData {
  const nodeData = node.model?.raw
  const defaultElement: ElementData = {
    id: node.id,
    type: '',
    name: '',
    field: node.id,
    header: '',
    visible: true,
    removable: true,
    isChild: false,
    category: 'Uncategorized',
    parameters: {},
    metadata: {},
    details: [],
    order: 0
  }

  if (!nodeData) {
    debug.warn(DebugCategories.DATA_TRANSFORM, 'Missing node data', {
      id: node.id
    })
    return defaultElement
  }

  if (isSpeckleReference(nodeData)) {
    debug.warn(DebugCategories.DATA_TRANSFORM, 'Node is a SpeckleReference', {
      id: node.id,
      referencedId: nodeData.referencedId
    })
    return {
      ...defaultElement,
      metadata: {
        referencedId: nodeData.referencedId
      }
    }
  }

  if (!isViewerNodeRaw(nodeData)) {
    debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node data format', {
      id: node.id
    })
    return defaultElement
  }

  // Get raw type from node data
  const rawType = (
    (nodeData.Other as { Category?: string })?.Category ||
    nodeData.speckle_type ||
    nodeData.type ||
    'Uncategorized'
  ).toString()

  // Map category using existing mapping system
  const category = getMostSpecificCategory(rawType)

  // Check if this is a parent element based on mapped category
  const isParent = parentCategories.includes(category)
  const isChild = !isParent && childCategories.includes(category)

  debug.log(DebugCategories.DATA_TRANSFORM, 'Category mapping', {
    rawType,
    mappedCategory: category,
    isParent,
    isChild,
    parentCategories,
    childCategories
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Converting node', {
    id: nodeData.id,
    category,
    isParent,
    isChild,
    type: nodeData.type,
    metadata: nodeData.metadata || {}
  })

  // Extract raw parameters from node data
  const extractedParams = extractNodeParameters(nodeData)

  // Convert extracted parameters to ElementParameter objects
  const parameters: Record<string, ElementParameter> = {}

  Object.entries(extractedParams).forEach(([paramName, param]) => {
    // Create ElementParameter with group info
    parameters[paramName] = createElementParameter(param.value, param.group, {
      category: nodeData.type || 'Uncategorized',
      elementId: nodeData.id,
      displayName: paramName
    })
  })

  // Add id and category as parameters
  parameters['id'] = createElementParameter(
    nodeData.id,
    {
      fetchedGroup: '0_Base',
      currentGroup: '0_Base'
    },
    {
      category: nodeData.type || 'Uncategorized',
      elementId: nodeData.id,
      displayName: 'ID'
    }
  )

  parameters['Category'] = createElementParameter(
    category,
    {
      fetchedGroup: '0_Base',
      currentGroup: '0_Base'
    },
    {
      category: nodeData.type || 'Uncategorized',
      elementId: nodeData.id,
      displayName: 'Category'
    }
  )

  debug.log(DebugCategories.PARAMETERS, 'Extracted parameters', {
    nodeId: nodeData.id,
    parameterCount: Object.keys(parameters).length,
    groups: Object.values(parameters).map((p) => p.group.fetchedGroup),
    sampleParameters: Object.entries(parameters)
      .slice(0, 3)
      .map(([key, param]) => ({
        key,
        value: param.value,
        type: typeof param.value,
        group: param.group
      }))
  })

  return {
    id: nodeData.id,
    type: nodeData.type || '',
    name: nodeData.Name || '',
    field: nodeData.id,
    header: nodeData.type || '',
    visible: true,
    removable: true,
    isChild,
    category,
    parameters,
    metadata: {
      ...nodeData.metadata,
      isParent,
      category
    },
    details: [],
    order: 0
  }
}

/**
 * Recursively traverse node and its children/elements
 */
async function traverseNode(
  node: ViewerNode,
  childCategories: string[] = []
): Promise<ElementData[]> {
  const elements: ElementData[] = []

  // Convert current node
  const convertedNode = await convertViewerNodeToElementData(node, childCategories)
  elements.push(convertedNode)

  // Get raw data
  const raw = node.model?.raw
  if (!raw || isSpeckleReference(raw)) return elements

  // Check for elements array
  if ('elements' in raw && Array.isArray(raw.elements)) {
    // Process SpeckleReference elements
    const elementPromises = raw.elements.map((element) => {
      if (!isSpeckleReference(element)) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid element type', {
          type: typeof element
        })
        return Promise.resolve([] as ElementData[])
      }

      debug.log(DebugCategories.DATA_TRANSFORM, 'Skipping SpeckleReference element', {
        referencedId: element.referencedId
      })
      return Promise.resolve([] as ElementData[])
    })

    const elementResults = await Promise.all(elementPromises)
    elements.push(...elementResults.flat())
  }

  // Check for children array
  if (node.children && Array.isArray(node.children)) {
    // Process each child node, filtering out SpeckleReferences
    const childPromises = node.children
      .filter((child) => {
        const raw = child.model?.raw
        if (!raw) return false
        if (isSpeckleReference(raw)) {
          debug.log(DebugCategories.DATA_TRANSFORM, 'Skipping SpeckleReference child', {
            id: child.id
          })
          return false
        }
        return true
      })
      .map((child) => traverseNode(child, childCategories))

    const childResults = await Promise.all(childPromises)
    elements.push(...childResults.flat())
  }

  return elements
}

/**
 * BIM elements composable
 * Handles BIM element initialization and state management
 */
export function useBIMElements(options: BIMElementsOptions = {}) {
  const store = useStore()
  const _parameterStore = useParameterStore() // Prefix with _ to indicate it's used internally

  // State
  const state = ref<BIMElementsState>({
    worldTree: null,
    worldTreeRoot: null,
    treeNodes: [],
    elements: [],
    isLoading: false,
    error: null
  })

  // Refhack for world tree reactivity
  const refhack = ref(1)
  useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
    if (isBusy) return
    refhack.value++
  })

  // Computed properties
  const allElements = computed(() => {
    refhack.value // Trigger recompute
    return state.value.elements
  })
  const rawWorldTree = computed(() => state.value.worldTree)
  const rawTreeNodes = computed(() => state.value.treeNodes)
  const isLoading = computed(() => state.value.isLoading)
  const hasError = computed(() => !!state.value.error)

  /**
   * Initialize BIM elements and process parameters
   */
  async function initializeElements(worldTree: WorldTreeRoot | null): Promise<void> {
    try {
      if (!worldTree || !worldTree._root) {
        debug.warn(DebugCategories.INITIALIZATION, 'No world tree data available')
        state.value = {
          worldTree: null,
          worldTreeRoot: null,
          treeNodes: [],
          elements: [],
          isLoading: false,
          error: null
        }
        return
      }

      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
      state.value.isLoading = true
      state.value.error = null

      // Process world tree nodes recursively
      const elements: ElementData[] = []
      if (worldTree._root.children?.length) {
        debug.log(DebugCategories.DATA, 'Processing world tree nodes', {
          childCount: worldTree._root.children.length
        })

        // Process each root child node
        for (const node of worldTree._root.children) {
          const nodeElements = await traverseNode(node, options.childCategories || [])
          elements.push(...nodeElements)
        }

        // Log element stats
        const elementStats = {
          total: elements.length,
          withParameters: elements.filter(
            (el) => el.parameters && Object.keys(el.parameters).length > 0
          ).length,
          categories: Array.from(new Set(elements.map((el) => el.category))),
          parameterGroups: Array.from(
            new Set(
              elements.flatMap((el) =>
                Object.keys(el.parameters || {}).map((key) => key.split('.')[0])
              )
            )
          )
        }

        debug.log(DebugCategories.DATA, 'Elements extracted', elementStats)
      }

      // Verify elements have parameters
      const elementsWithParams = elements.filter(
        (el) => el.parameters && Object.keys(el.parameters).length > 0
      )

      if (elementsWithParams.length === 0) {
        debug.warn(DebugCategories.DATA, 'No elements with parameters found')
        return
      }

      // Update local state
      state.value = {
        worldTree: null,
        worldTreeRoot: worldTree,
        treeNodes: [],
        elements,
        isLoading: false,
        error: null
      }

      // Update store with element data
      await store.lifecycle.update({
        scheduleData: elements
      })

      // Log final stats
      const stats = {
        totalElements: elements.length,
        parentElements: elements.filter((el) => el.metadata?.isParent).length,
        childElements: elements.filter((el) => el.isChild).length,
        parameters: {
          total: elements.reduce(
            (acc, el) => acc + Object.keys(el.parameters || {}).length,
            0
          ),
          unique: new Set(elements.flatMap((el) => Object.keys(el.parameters || {})))
            .size
        }
      }

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'BIM elements initialized',
        stats
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize BIM elements:', err)
      state.value = {
        worldTree: null,
        worldTreeRoot: null,
        treeNodes: [],
        elements: [],
        isLoading: false,
        error:
          err instanceof Error
            ? err
            : new Error(
                typeof err === 'string' ? err : 'Failed to initialize BIM elements'
              )
      }
    }
  }

  /**
   * Stop watching world tree changes
   */
  function stopWorldTreeWatch(): void {
    debug.log(DebugCategories.STATE, 'Stopped watching world tree changes')
  }

  return {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading,
    hasError,
    initializeElements,
    stopWorldTreeWatch
  }
}
