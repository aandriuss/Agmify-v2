import { ref, computed } from 'vue'
import type {
  ElementData,
  ViewerTree,
  TreeNode,
  ViewerNode,
  ViewerNodeRaw,
  WorldTreeRoot
} from '~/composables/core/types'
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
import { createElementData } from '~/composables/core/types/elements'

interface BIMElementsState {
  worldTree: ViewerTree | null
  treeNodes: TreeNode[]
  elements: ElementData[]
  isLoading: boolean
  error: Error | null
}

interface BIMElementsOptions {
  childCategories?: string[]
}

/**
 * Extract BIM parameters from node data
 */
function extractParameters(nodeData: ViewerNodeRaw): Record<string, ParameterValue> {
  const parameters: Record<string, ParameterValue> = {}

  // Ensure we have a valid ViewerNodeRaw
  if (!isViewerNodeRaw(nodeData)) {
    debug.warn(DebugCategories.PARAMETERS, 'Invalid node data format')
    return parameters
  }

  // Get core properties to skip
  const coreProperties = new Set([
    'id',
    'type',
    'Name',
    'metadata',
    'children',
    'parameters',
    'elements'
  ])

  // Process direct parameters first
  Object.entries(nodeData)
    .filter(([key]) => {
      const isCore = coreProperties.has(key)
      const isSystem = key.startsWith('__') || key.startsWith('@')
      return !isCore && !isSystem
    })
    .forEach(([key, value]) => {
      if (value === null || value === undefined) return

      if (typeof value === 'object' && !Array.isArray(value)) {
        // This is a parameter group (like Dimensions, Constraints, etc)
        const groupValues = value as Record<string, unknown>
        Object.entries(groupValues).forEach(([subKey, subValue]) => {
          if (subValue !== null && subValue !== undefined) {
            // Create grouped parameter key (e.g., "Dimensions.Length")
            const paramKey = `${key}.${subKey}`
            parameters[paramKey] = subValue as ParameterValue
          }
        })
      } else {
        // This is a direct parameter
        parameters[key] = value as ParameterValue
      }
    })

  return parameters
}

/**
 * Convert ViewerNode to ElementData format
 */
async function convertViewerNodeToElementData(
  node: ViewerNode,
  childCategories: string[] = []
): Promise<ElementData> {
  const nodeData = node.model?.raw
  if (!nodeData || isSpeckleReference(nodeData) || !isViewerNodeRaw(nodeData)) {
    debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node data', {
      id: node.id,
      hasRaw: !!nodeData,
      isReference: isSpeckleReference(nodeData),
      isValidFormat: isViewerNodeRaw(nodeData)
    })
    return createElementData({
      id: node.id,
      type: '',
      name: '',
      category: 'Uncategorized',
      isChild: false
    })
  }

  const category =
    (nodeData.Other as { Category?: string })?.Category ||
    nodeData.speckle_type ||
    nodeData.type ||
    'Uncategorized'
  const isChild = childCategories.includes(category)

  // debug.log(DebugCategories.DATA_TRANSFORM, 'Converting node', {
  //   id: nodeData.id,
  //   category,
  //   isChild,
  //   type: nodeData.type
  // })

  // Extract all parameters with proper grouping
  const parameters = await extractParameters(nodeData)

  // debug.log(DebugCategories.PARAMETERS, 'Extracted parameters', {
  //   nodeId: nodeData.id,
  //   parameterCount: Object.keys(parameters).length,
  //   groups: Array.from(new Set(Object.keys(parameters).map((key) => key.split('.')[0])))
  // })

  return createElementData({
    id: nodeData.id,
    type: nodeData.type || '',
    name: nodeData.Name || '',
    field: nodeData.id,
    header: nodeData.type || '',
    isChild,
    category,
    parameters,
    metadata: nodeData.metadata || {}
  })
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
  elements.push(await convertViewerNodeToElementData(node, childCategories))

  // Get raw data
  const raw = node.model?.raw
  if (!raw || isSpeckleReference(raw)) return elements

  // Check for elements array
  if ('elements' in raw && Array.isArray(raw.elements)) {
    for (const element of raw.elements) {
      if (isViewerNodeRaw(element)) {
        // Convert element to ViewerNode format
        const elementNode: ViewerNode = {
          id: element.id,
          model: {
            raw: element
          }
        }
        elements.push(...(await traverseNode(elementNode, childCategories)))
      }
    }
  }

  // Check for children array
  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      elements.push(...(await traverseNode(child, childCategories)))
    }
  }

  return elements
}

/**
 * BIM elements composable
 * Handles BIM element initialization and state management
 */
export function useBIMElements(options: BIMElementsOptions = {}) {
  const store = useStore()
  const parameterStore = useParameterStore()

  // State
  const state = ref<BIMElementsState>({
    worldTree: null,
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
   * Initialize BIM elements directly from world tree
   */
  async function initializeElements(worldTree?: WorldTreeRoot): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
      state.value.isLoading = true
      state.value.error = null

      // Get nodes from world tree
      const tree = worldTree
      if (!tree?._root?.children?.length) {
        debug.error(DebugCategories.DATA, 'No world tree data available')
        throw new Error('No world tree data available')
      }

      debug.log(DebugCategories.DATA, 'World tree data', {
        hasRoot: !!tree._root,
        childrenCount: tree._root.children.length,
        firstChild: tree._root.children[0]
      })

      // Convert nodes to ElementData format recursively
      const convertedElements: ElementData[] = []
      for (const node of tree._root.children) {
        if (node) {
          convertedElements.push(...(await traverseNode(node, options.childCategories)))
        }
      }

      debug.log(DebugCategories.DATA, 'Converted elements', {
        count: convertedElements.length,
        sample: convertedElements[5],
        childCount: convertedElements.filter((el) => el.isChild).length,
        parentCount: convertedElements.filter((el) => !el.isChild).length
      })

      // Update local state
      state.value.elements = convertedElements

      // Update stores with element data and parameters
      await Promise.all([
        store.lifecycle.update({
          scheduleData: convertedElements
        }),
        // Extract parameters for parameter store
        (async () => {
          const parentElements = convertedElements.filter((el) => !el.isChild)
          const childElements = convertedElements.filter((el) => el.isChild)

          // Helper function to convert parameters to BIM parameters
          const convertToBimParams = (element: ElementData) => {
            const params = element.parameters || {}
            return Object.entries(params).map(([key, value]) => {
              const parts = key.split('.')
              const name = parts.length > 1 ? parts[parts.length - 1] : key
              const group = parts.length > 1 ? parts[0] : 'Parameters'

              return {
                id: key,
                name,
                value,
                sourceGroup: group,
                metadata: {
                  category: element.category,
                  fullKey: key,
                  isSystem: false,
                  group,
                  elementId: element.id,
                  isNested: parts.length > 1,
                  parentKey: parts.length > 1 ? parts[0] : undefined
                }
              }
            })
          }

          // Process parent parameters
          if (parentElements.length > 0) {
            const parentParams = parentElements.flatMap(convertToBimParams)
            await parameterStore.processRawParameters(parentParams, true)
          }

          // Process child parameters
          if (childElements.length > 0) {
            const childParams = childElements.flatMap(convertToBimParams)
            await parameterStore.processRawParameters(childParams, false)
          }
        })()
      ])

      debug.completeState(DebugCategories.INITIALIZATION, 'BIM elements initialized', {
        elementCount: convertedElements.length,
        hasWorldTree: !!state.value.worldTree,
        nodeCount: state.value.treeNodes.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize BIM elements:', err)
      state.value.error =
        err instanceof Error ? err : new Error('Failed to initialize BIM elements')
      throw state.value.error
    } finally {
      state.value.isLoading = false
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
