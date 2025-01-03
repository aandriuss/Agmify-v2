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
import { convertToParameterValue } from '~/composables/core/parameters/parameter-processing'

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
function extractNodeParameters(
  nodeData: ViewerNodeRaw
): Record<string, ParameterValue> {
  // Get core properties that should be excluded
  const coreProperties = new Set([
    'id',
    'type',
    'Name',
    'metadata',
    'children',
    'parameters',
    'elements',
    'speckle_type',
    'applicationId',
    'renderMaterial'
  ])

  // Extract all properties except core and system ones
  const parameters: Record<string, ParameterValue> = {}

  function processValue(value: unknown, prefix = ''): void {
    if (value === null || value === undefined) return

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Process nested object
      Object.entries(value as Record<string, unknown>).forEach(([key, val]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key

        // Skip core and system properties
        const isCore = coreProperties.has(key)
        const isSystem = key.startsWith('__') || key.startsWith('@')

        if (!isCore && !isSystem) {
          if (typeof val === 'object' && !Array.isArray(val) && val !== null) {
            processValue(val, fullKey)
          } else {
            const convertedValue = convertToParameterValue(val)
            if (convertedValue !== null) {
              parameters[fullKey] = convertedValue
            }
          }
        }
      })
    } else {
      // Convert non-object value
      const convertedValue = convertToParameterValue(value)
      if (convertedValue !== null && prefix) {
        parameters[prefix] = convertedValue
      }
    }
  }

  // Process top-level properties
  Object.entries(nodeData).forEach(([key, value]) => {
    const isCore = coreProperties.has(key)
    const isSystem = key.startsWith('__') || key.startsWith('@')

    if (!isCore && !isSystem) {
      processValue(value, key)
    }
  })

  // Log extracted parameters for debugging
  if (Object.keys(parameters).length > 0) {
    debug.log(DebugCategories.PARAMETERS, 'Extracted parameters from node', {
      nodeId: nodeData.id,
      parameterCount: Object.keys(parameters).length,
      sampleKeys: Object.keys(parameters).slice(0, 5),
      sampleValues: Object.values(parameters).slice(0, 5)
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
  if (!nodeData || isSpeckleReference(nodeData)) {
    debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node data', {
      id: node.id,
      hasRaw: !!nodeData,
      isReference: isSpeckleReference(nodeData)
    })
    return {
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
  }

  if (!isViewerNodeRaw(nodeData)) {
    debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node data format', {
      id: node.id
    })
    return {
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
  }

  const category =
    (nodeData.Other as { Category?: string })?.Category ||
    nodeData.speckle_type ||
    nodeData.type ||
    'Uncategorized'
  const isChild = childCategories.includes(category)

  debug.log(DebugCategories.DATA_TRANSFORM, 'Converting node', {
    id: nodeData.id,
    category,
    isChild,
    type: nodeData.type
  })

  // Extract raw parameters from node data
  const parameters = extractNodeParameters(nodeData)

  debug.log(DebugCategories.PARAMETERS, 'Extracted parameters', {
    nodeId: nodeData.id,
    parameterCount: Object.keys(parameters).length,
    groups: Array.from(
      new Set(Object.keys(parameters).map((key) => key.split('.')[0]))
    ),
    sampleParameters: Object.entries(parameters)
      .slice(0, 3)
      .map(([key, value]) => ({
        key,
        value,
        type: typeof value
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
    metadata: nodeData.metadata || {},
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
  elements.push(convertViewerNodeToElementData(node, childCategories))

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
   * Initialize BIM elements directly from world tree
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
      }

      state.value = {
        worldTree: null,
        worldTreeRoot: worldTree,
        treeNodes: [],
        elements,
        isLoading: false,
        error: null
      }

      debug.log(DebugCategories.DATA, 'BIM elements initialized', {
        elementCount: elements.length
      })

      // Update local state
      state.value.elements = elements

      // Update store with element data
      await store.lifecycle.update({
        scheduleData: elements
      })

      debug.log(DebugCategories.DATA, 'BIM elements processed', {
        totalElements: elements.length,
        parentElements: elements.filter((el) => !el.isChild).length,
        childElements: elements.filter((el) => el.isChild).length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize BIM elements:', err)
      state.value = {
        worldTree: null,
        worldTreeRoot: null,
        treeNodes: [],
        elements: [],
        isLoading: false,
        error:
          err instanceof Error ? err : new Error('Failed to initialize BIM elements')
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
