import { ref, computed } from 'vue'
import type {
  ElementData,
  ViewerTree,
  TreeNode,
  ViewerNode,
  ViewerNodeRaw,
  WorldTreeRoot
} from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { ViewerEvent } from '@speckle/viewer'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import {
  isSpeckleReference,
  isViewerNodeRaw
} from '~/composables/core/types/viewer/viewer-types'
import {
  processRawParameters,
  convertToParameterValue
} from '~/composables/core/parameters/next/utils/parameter-processing'

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

interface ParameterStats {
  raw: number
  unique: Set<string>
  groups: Map<string, Set<string>>
  activeGroups: Map<string, Set<string>>
}

function initParameterStats(): ParameterStats {
  return {
    raw: 0,
    unique: new Set(),
    groups: new Map(),
    activeGroups: new Map()
  }
}

function updateParameterStats(
  stats: ParameterStats,
  key: string,
  _value: unknown
): void {
  stats.raw++
  stats.unique.add(key)

  // Handle parameter grouping
  const parts = key.split('.')
  if (parts.length > 1) {
    const group = parts[0]
    const param = parts[parts.length - 1]
    if (!stats.groups.has(group)) {
      stats.groups.set(group, new Set())
      stats.activeGroups.set(group, new Set())
    }
    stats.groups.get(group)!.add(param)
    // Mark as active if not a system parameter
    if (!key.startsWith('__')) {
      stats.activeGroups.get(group)!.add(param)
    }
  } else {
    if (!stats.groups.has('Parameters')) {
      stats.groups.set('Parameters', new Set())
      stats.activeGroups.set('Parameters', new Set())
    }
    stats.groups.get('Parameters')!.add(key)
    // Mark as active if not a system parameter
    if (!key.startsWith('__')) {
      stats.activeGroups.get('Parameters')!.add(key)
    }
  }
}

/**
 * Process parameter object with flattened dot notation
 */
function processParameterObject(
  obj: Record<string, unknown>,
  nodeData: ViewerNodeRaw,
  prefix = '',
  result: Record<string, ParameterValue> = {},
  stats?: ParameterStats
): Promise<Record<string, ParameterValue>> {
  for (const [key, value] of Object.entries(obj)) {
    // Skip system parameters
    if (key.startsWith('__')) continue

    // Handle already flattened parameters (with dot notation)
    // const parts = key.split('.')
    // const paramName = parts[parts.length - 1]
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && value !== undefined) {
      // Handle different value types
      let parsedValue: unknown = value
      let isJsonString = false
      let isComplexType = false

      if (typeof value === 'string') {
        // Try parsing JSON strings
        if (value.startsWith('{') && value.endsWith('}')) {
          try {
            const parsed = JSON.parse(value) as Record<string, unknown>
            if (typeof parsed === 'object' && parsed !== null) {
              parsedValue = parsed
              isJsonString = true
              isComplexType = !Array.isArray(parsed)
            }
          } catch (err) {
            debug.warn(
              DebugCategories.PARAMETERS,
              `Failed to parse JSON parameter ${key}:`,
              err
            )
          }
        }
      } else if (value !== null && typeof value === 'object') {
        // Handle arrays and objects directly
        if (Array.isArray(value)) {
          parsedValue = value
          isComplexType = false
        } else {
          // Ensure we have a proper Record type
          const objValue = value as Record<string, unknown>
          parsedValue = objValue
          isComplexType = true
        }
      }

      // Create raw parameter without processing
      result[fullKey] = convertToParameterValue(parsedValue)
      if (stats) {
        updateParameterStats(stats, fullKey, parsedValue)
      }

      // Process nested parameters for complex objects (not arrays)
      if (
        (isJsonString || isComplexType) &&
        typeof parsedValue === 'object' &&
        !Array.isArray(parsedValue)
      ) {
        // Ensure we have a proper Record type
        const objValue = parsedValue as Record<string, unknown>
        for (const [nestedKey, nestedValue] of Object.entries(objValue)) {
          const nestedFullKey = `${fullKey}.${nestedKey}`
          // Add nested parameter without processing
          result[nestedFullKey] = convertToParameterValue(nestedValue)
          if (stats) {
            updateParameterStats(stats, nestedFullKey, nestedValue)
          }
        }
      }
    }
  }

  return Promise.resolve(result)
}

/**
 * Extract parameters from node data
 */
async function extractParameters(
  nodeData: ViewerNodeRaw
): Promise<Record<string, ParameterValue>> {
  const parameters: Record<string, ParameterValue> = {}
  const stats = initParameterStats()

  // Ensure we have a valid ViewerNodeRaw
  if (!isViewerNodeRaw(nodeData)) {
    debug.warn(DebugCategories.PARAMETERS, 'Invalid node data format')
    return parameters
  }

  debug.log(DebugCategories.PARAMETERS, 'Raw node data', {
    id: nodeData.id,
    type: nodeData.type,
    hasIdentityData: !!nodeData['Identity Data'],
    hasOther: !!nodeData.Other,
    hasParameters: !!nodeData.parameters
  })

  // Get core properties from ViewerNodeRaw type
  const coreProperties = new Set([
    'id',
    'type',
    'Name',
    'metadata',
    'children',
    'parameters'
  ])

  // Process all properties as potential parameter groups
  const entries = Object.entries(nodeData)
  const parameterPromises = entries
    .filter(([key]) => {
      // Skip core properties and system parameters
      const isCore = coreProperties.has(key)
      const isSystem = key.startsWith('__') || key.startsWith('@')
      return !isCore && !isSystem
    })
    .map(async ([key, value]) => {
      // Handle value based on type
      if (value === null || value === undefined) {
        return
      }

      // Determine parameter group
      const group = key.includes('.') ? key.split('.')[0] : 'Parameters'

      if (typeof value === 'object') {
        if (!Array.isArray(value)) {
          // Handle object properties as parameter groups
          await processParameterObject(
            value as Record<string, unknown>,
            nodeData,
            group,
            parameters,
            stats
          )
        } else {
          // Handle array values as stringified JSON
          const rawParam = {
            id: key,
            name: key.includes('.') ? key.split('.')[1] : key,
            value: JSON.stringify(value),
            sourceGroup: group,
            metadata: {
              category: nodeData.type || 'Uncategorized',
              fullKey: key,
              isSystem: false,
              group,
              elementId: nodeData.id
            }
          }
          const [processed] = await processRawParameters([rawParam])
          if (processed) {
            parameters[key] = processed.value
            updateParameterStats(stats, key, processed.value)
          }
        }
      } else if (value !== undefined && value !== null) {
        // Handle primitive values as top-level parameters
        const rawParam = {
          id: key,
          name: key,
          value,
          sourceGroup: 'Parameters',
          metadata: {
            category: nodeData.type || 'Uncategorized',
            fullKey: key,
            isSystem: false,
            group: 'Parameters',
            elementId: nodeData.id
          }
        }
        const [processed] = await processRawParameters([rawParam])
        if (processed) {
          parameters[key] = processed.value
          updateParameterStats(stats, key, processed.value)
        }
      }
    })

  await Promise.all(parameterPromises)

  debug.log(DebugCategories.PARAMETERS, 'Parameter extraction stats', {
    raw: stats.raw,
    unique: stats.unique.size,
    groups: Object.fromEntries(
      Array.from(stats.groups.entries()).map(([group, params]) => [
        group,
        {
          total: params.size,
          active: stats.activeGroups.get(group)?.size || 0,
          parameters: Array.from(params),
          activeParameters: Array.from(stats.activeGroups.get(group) || new Set())
        }
      ])
    ),
    extractedParameters: parameters
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
      details: []
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
      details: []
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

  // Extract all parameters with proper grouping
  const parameters = await extractParameters(nodeData)

  debug.log(DebugCategories.PARAMETERS, 'Extracted parameters', {
    nodeId: nodeData.id,
    parameterCount: Object.keys(parameters).length,
    groups: Array.from(new Set(Object.keys(parameters).map((key) => key.split('.')[0])))
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
    details: []
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
        debug.warn(DebugCategories.DATA, 'No world tree data available')
        return
      }

      debug.log(DebugCategories.DATA, 'World tree root', {
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

          // Process parent parameters
          if (parentElements.length > 0) {
            const parentParams = parentElements.flatMap((element) =>
              Object.entries(element.parameters).map(([key, value]) => ({
                id: key,
                name: key.includes('.') ? key.split('.').pop()! : key,
                value,
                sourceGroup: key.includes('.') ? key.split('.')[0] : 'Parameters',
                metadata: {
                  category: element.category,
                  fullKey: key,
                  isSystem: false,
                  group: key.includes('.') ? key.split('.')[0] : 'Parameters',
                  elementId: element.id
                }
              }))
            )
            await parameterStore.processRawParameters(parentParams, true)
          }

          // Process child parameters
          if (childElements.length > 0) {
            const childParams = childElements.flatMap((element) =>
              Object.entries(element.parameters).map(([key, value]) => ({
                id: key,
                name: key.includes('.') ? key.split('.').pop()! : key,
                value,
                sourceGroup: key.includes('.') ? key.split('.')[0] : 'Parameters',
                metadata: {
                  category: element.category,
                  fullKey: key,
                  isSystem: false,
                  group: key.includes('.') ? key.split('.')[0] : 'Parameters',
                  elementId: element.id
                }
              }))
            )
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
