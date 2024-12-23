import { ref, computed } from 'vue'
import type {
  ElementData,
  ViewerTree,
  TreeNode,
  ViewerNode,
  ViewerNodeRaw,
  WorldTreeRoot,
  SelectedParameter,
  RawParameter
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
import { convertToParameterValue } from '~/composables/core/parameters/parameter-processing'

interface BIMElementsState {
  worldTree: ViewerTree | null
  treeNodes: TreeNode[]
  elements: ElementData[]
  isLoading: boolean
  error: Error | null
}

interface BIMElementsOptions {
  childCategories: string[]
}

/**
 * Get node category with proper type handling
 */
function getNodeCategory(nodeData: ViewerNodeRaw): string {
  const other = nodeData as { Other?: { Category?: string } }
  return (
    other.Other?.Category ||
    (nodeData as { speckle_type?: string }).speckle_type ||
    (nodeData as { type?: string }).type ||
    'Uncategorized'
  )
}

/**
 * Safely get node property with type assertion
 */
function getNodeProperty(
  nodeData: ViewerNodeRaw,
  key: keyof ViewerNodeRaw,
  defaultValue: string
): string {
  const value = nodeData[key]
  return (value as string | undefined) ?? defaultValue
}

/**
 * Safely get node ID with type assertion
 */
function getNodeId(node: ViewerNodeRaw | ViewerNode): string {
  if ('id' in node) {
    return (node.id as string | undefined) ?? ''
  }
  return ''
}

/**
 * Create viewer node with type safety
 */
function createViewerNode(element: ViewerNodeRaw): ViewerNode {
  return {
    id: getNodeId(element),
    model: { raw: element }
  }
}

/**
 * BIM elements composable
 * Handles BIM element initialization and state management
 */
export function useBIMElements(options: BIMElementsOptions) {
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

  /**
   * Get value from object using dot notation path
   */
  function getValueByPath(
    obj: Record<string, unknown>,
    path: string
  ): unknown | undefined {
    const parts = path.split('.')
    let value: unknown = obj

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return value
  }

  /**
   * Phase 2: Create parameter map with values for selected parameters
   * Includes all selected parameters (with null for missing ones)
   */
  function createParameterMap(
    nodeData: ViewerNodeRaw,
    selectedParams: string[]
  ): Record<string, ParameterValue> {
    const parameters: Record<string, ParameterValue> = {}

    // Initialize all selected parameters with null
    selectedParams.forEach((paramKey) => {
      parameters[paramKey] = null
    })

    // Fill in values for parameters that exist
    selectedParams.forEach((paramKey) => {
      const value = getValueByPath(nodeData, paramKey)
      if (value !== undefined) {
        parameters[paramKey] = convertToParameterValue(value)
      }
    })

    return parameters
  }

  /**
   * Convert ViewerNode to basic ElementData format without parameters
   */
  function convertViewerNodeToBasicElementData(
    node: ViewerNode,
    childCategories: string[]
  ): ElementData {
    const nodeData = node.model?.raw
    if (!nodeData || isSpeckleReference(nodeData)) {
      debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node data', {
        id: node.id,
        hasRaw: !!nodeData,
        isReference: isSpeckleReference(nodeData)
      })
      return createEmptyElementData(node.id)
    }

    if (!isViewerNodeRaw(nodeData)) {
      debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid node data format', {
        id: node.id
      })
      return createEmptyElementData(node.id)
    }

    const category = isViewerNodeRaw(nodeData)
      ? getNodeCategory(nodeData)
      : 'Uncategorized'
    const isChild = childCategories.includes(category)

    return {
      id: getNodeProperty(nodeData, 'id', ''),
      type: getNodeProperty(nodeData, 'type', ''),
      name: getNodeProperty(nodeData, 'Name', ''),
      field: getNodeProperty(nodeData, 'id', ''),
      header: getNodeProperty(nodeData, 'type', ''),
      visible: true,
      removable: true,
      isChild,
      category,
      parameters: {}, // Empty initially, filled in phase 2
      metadata: nodeData.metadata ?? {},
      details: [],
      order: 0
    }
  }

  /**
   * Create empty ElementData
   */
  function createEmptyElementData(id: string): ElementData {
    return {
      id,
      type: '',
      name: '',
      field: id,
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

  /**
   * Recursively collect parameters from a node and its children
   */
  /**
   * Phase 1: Collect unique parameter keys by category
   */
  function collectNodeParameters(
    node: ViewerNode,
    categoryParams: Map<string, Set<string>>
  ): void {
    // Get raw data from node
    const raw = node.model?.raw
    if (!raw || isSpeckleReference(raw)) {
      debug.warn(DebugCategories.DATA, 'Invalid node data', {
        hasRaw: !!raw,
        isReference: isSpeckleReference(raw),
        nodeId: node.id
      })
      return
    }

    // Check if raw data is valid ViewerNodeRaw
    if (!isViewerNodeRaw(raw)) {
      debug.warn(DebugCategories.DATA, 'Invalid node data format', {
        nodeId: node.id,
        hasRaw: !!raw,
        hasId: raw && typeof raw === 'object' && 'id' in raw,
        hasSpeckleType: raw && typeof raw === 'object' && 'speckle_type' in raw,
        properties: raw && typeof raw === 'object' ? Object.keys(raw) : []
      })
      return
    }

    // Now we can safely use raw as ViewerNodeRaw
    const nodeData = raw
    debug.log(DebugCategories.DATA, 'Processing node data', {
      nodeId: nodeData.id,
      speckleType: nodeData.speckle_type,
      type: nodeData.type || 'unknown',
      category: getNodeCategory(nodeData),
      properties: Object.keys(nodeData).filter(
        (key) => !key.startsWith('__') && !key.startsWith('@')
      )
    })

    // Get category and initialize set
    const category = getNodeCategory(nodeData)
    debug.log(DebugCategories.DATA, 'Processing node', {
      category,
      type: nodeData.type,
      id: nodeData.id
    })

    // Initialize category set
    if (!categoryParams.has(category)) {
      categoryParams.set(category, new Set())
    }

    // Core properties to skip (minimal set)
    const coreProperties = new Set(['id', 'metadata', 'children', 'elements'])

    // Process parameters in groups
    function processParameterGroup(value: unknown, group: string, key: string): void {
      // Skip system properties
      if (key.startsWith('__') || key.startsWith('@')) return

      // Handle different value types
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Process nested object properties
          Object.entries(value as Record<string, unknown>).forEach(
            ([subKey, subValue]) => {
              if (!subKey.startsWith('__')) {
                const paramKey = group ? `${group}.${subKey}` : subKey
                if (subValue !== undefined && subValue !== null) {
                  categoryParams.get(category)?.add(paramKey)
                }
              }
            }
          )
        } else {
          // Handle direct value
          const paramKey = group ? `${group}.${key}` : key
          categoryParams.get(category)?.add(paramKey)
        }
      }
    }

    // First process direct parameters
    if (nodeData.parameters) {
      Object.entries(nodeData.parameters).forEach(([key, value]) => {
        processParameterGroup(value, 'Parameters', key)
      })
    }

    // Then process other property groups
    Object.entries(nodeData).forEach(([groupKey, groupValue]) => {
      // Skip core and system properties
      if (coreProperties.has(groupKey) || groupKey === 'parameters') {
        return
      }

      // Process group
      processParameterGroup(groupValue, groupKey, '')
    })

    debug.log(DebugCategories.PARAMETERS, 'Discovered parameters', {
      category,
      parameterCount: categoryParams.get(category)?.size || 0,
      sampleParameters: Array.from(categoryParams.get(category) || []).slice(0, 5)
    })

    // Recursively process elements array
    const elements = nodeData.elements as ViewerNodeRaw[] | undefined
    if (Array.isArray(elements)) {
      elements.forEach((element) => {
        if (isViewerNodeRaw(element)) {
          const elementNode = createViewerNode(element)
          collectNodeParameters(elementNode, categoryParams)
        }
      })
    }

    // Recursively process children array
    const children = node.children as ViewerNode[] | undefined
    if (Array.isArray(children)) {
      children.forEach((child) => {
        if (child) {
          collectNodeParameters(child, categoryParams)
        }
      })
    }
  }

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
  async function initializeElements(worldTree: WorldTreeRoot): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
      state.value.isLoading = true
      state.value.error = null

      // Phase 1: Parameter Discovery
      debug.startState(DebugCategories.DATA, 'Phase 1: Parameter Discovery')
      const categoryParams = new Map<string, Set<string>>()

      // Traverse tree to discover parameters
      for (const node of worldTree._root.children || []) {
        if (node) {
          try {
            collectNodeParameters(node, categoryParams)
          } catch (err) {
            debug.error(
              DebugCategories.ERROR,
              'Failed to collect parameters from node:',
              {
                nodeId: node.id,
                error: err instanceof Error ? err.message : String(err)
              }
            )
          }
        }
      }

      debug.log(DebugCategories.DATA, 'Parameter collection complete', {
        categoryCount: categoryParams.size,
        categories: Array.from(categoryParams.keys())
      })

      // Initialize parameter store
      await parameterStore.init()

      // Convert discovered parameters to raw parameters
      debug.startState(DebugCategories.DATA, 'Processing parameters')
      const parameterPromises: Promise<void>[] = []

      // Process parameters by category
      for (const [category, params] of categoryParams.entries()) {
        const isChild = options.childCategories.includes(category)
        const rawParams = Array.from(params).map((paramKey) => {
          const parts = paramKey.split('.')
          const name = parts.pop() || paramKey
          const group = parts.length > 0 ? parts.join('.') : 'Parameters'

          // In Phase 1, we only collect parameter metadata without values
          const param: RawParameter = {
            id: paramKey,
            name,
            value: null, // Values are collected in Phase 2
            sourceGroup: group,
            metadata: {
              category,
              fullKey: paramKey,
              isSystem: false,
              group
            }
          }
          return param
        })

        // Process parameters for this category
        parameterPromises.push(parameterStore.processRawParameters(rawParams, !isChild))
      }

      // Wait for all parameter processing to complete
      await Promise.all(parameterPromises)

      // Log parameter store state
      debug.log(DebugCategories.PARAMETERS, 'Parameter store state', {
        raw: {
          parent: parameterStore.parentRawParameters.value?.length || 0,
          child: parameterStore.childRawParameters.value?.length || 0
        },
        available: {
          parent: parameterStore.parentAvailableBimParameters.value?.length || 0,
          child: parameterStore.childAvailableBimParameters.value?.length || 0
        },
        selected: {
          parent: parameterStore.parentSelectedParameters.value?.length || 0,
          child: parameterStore.childSelectedParameters.value?.length || 0
        }
      })

      // Log parameter processing results
      debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
        categories: Array.from(categoryParams.entries()).map(([category, params]) => ({
          category,
          isChild: options.childCategories.includes(category),
          paramCount: params.size,
          sampleParams: Array.from(params).slice(0, 3)
        })),
        storeState: {
          raw: {
            parent: parameterStore.parentRawParameters.value?.length || 0,
            child: parameterStore.childRawParameters.value?.length || 0
          },
          available: {
            parent: parameterStore.parentAvailableBimParameters.value?.length || 0,
            child: parameterStore.childAvailableBimParameters.value?.length || 0
          }
        }
      })

      // Phase 2: Process Elements
      debug.startState(DebugCategories.DATA, 'Phase 2: Processing Elements')

      // Then process elements
      const convertedElements: ElementData[] = []
      const processedNodes = new Set<string>()

      function processNodeAndChildren(node: ViewerNode): void {
        const nodeData = node.model?.raw
        if (!nodeData || isSpeckleReference(nodeData)) return

        // Map node if it has parameters
        if (isViewerNodeRaw(nodeData)) {
          const nodeId = getNodeProperty(nodeData, 'id', '')
          if (nodeId && !processedNodes.has(nodeId)) {
            processedNodes.add(nodeId)

            // Convert to element data
            const element = convertViewerNodeToBasicElementData(
              node,
              options.childCategories
            )

            // Add parameter values
            const category = element.category || 'Uncategorized'
            const isChild = options.childCategories.includes(category)
            const selectedParams = parameterStore.state.value.collections[
              isChild ? 'child' : 'parent'
            ].selected
              .filter((param): param is SelectedParameter => param.kind === 'bim')
              .map((param) => param.id)

            element.parameters = createParameterMap(nodeData, selectedParams)

            convertedElements.push(element)
          }

          // Process elements array
          const elements = nodeData.elements as ViewerNodeRaw[] | undefined
          if (Array.isArray(elements)) {
            elements.forEach((element) => {
              if (isViewerNodeRaw(element)) {
                const elementNode = createViewerNode(element)
                processNodeAndChildren(elementNode)
              }
            })
          }
        }

        // Process children array
        const children = node.children as ViewerNode[] | undefined
        if (Array.isArray(children)) {
          children.forEach((child) => {
            if (child) {
              processNodeAndChildren(child)
            }
          })
        }
      }

      // Process all nodes
      let processedCount = 0
      let errorCount = 0
      for (const node of worldTree._root.children || []) {
        if (node) {
          try {
            processNodeAndChildren(node)
            processedCount++
          } catch (err) {
            errorCount++
            debug.error(DebugCategories.ERROR, 'Failed to process node and children:', {
              nodeId: node.id,
              error: err instanceof Error ? err.message : String(err)
            })
          }
        }
      }

      debug.log(DebugCategories.DATA, 'Node processing complete', {
        processedCount,
        errorCount,
        totalNodes: (worldTree._root.children || []).length
      })

      // Group elements by category for logging
      const categorizedElements = new Map<string, ElementData[]>()
      convertedElements.forEach((element) => {
        const category = element.category || 'Uncategorized'
        const existingElements = categorizedElements.get(category) || []
        categorizedElements.set(category, [...existingElements, element])
      })

      debug.log(DebugCategories.DATA, 'Processing summary', {
        parameters: {
          categories: Array.from(categoryParams.keys()),
          counts: Array.from(categoryParams.entries()).map(([cat, params]) => ({
            category: cat,
            count: params.size
          }))
        },
        elements: {
          total: convertedElements.length,
          byCategory: Array.from(categorizedElements.entries()).map(([cat, els]) => ({
            category: cat,
            count: els.length,
            isChild: options.childCategories.includes(cat)
          })),
          childCount: convertedElements.filter((el) => el.isChild).length,
          parentCount: convertedElements.filter((el) => !el.isChild).length
        },
        processing: {
          errors: {
            total: errorCount,
            rate: `${((errorCount / processedCount) * 100).toFixed(1)}%`
          },
          success: {
            total: processedCount,
            rate: `${(
              (processedCount / (worldTree._root.children || []).length) *
              100
            ).toFixed(1)}%`
          }
        }
      })

      // Update stores
      state.value = {
        ...state.value,
        elements: convertedElements,
        isLoading: false,
        error: null
      }

      await store.lifecycle.update({
        scheduleData: convertedElements
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'BIM elements initialized', {
        elementCount: convertedElements.length,
        hasWorldTree: !!state.value.worldTree,
        nodeCount: state.value.treeNodes.length
      })
    } catch (err) {
      debug.error(
        DebugCategories.ERROR,
        'Failed to initialize BIM elements:',
        err instanceof Error ? err : new Error(String(err))
      )
      state.value.error =
        err instanceof Error ? err : new Error('Failed to initialize BIM elements')
      throw state.value.error
    } finally {
      state.value.isLoading = false
    }
  }

  return {
    allElements,
    rawWorldTree,
    rawTreeNodes,
    isLoading,
    hasError,
    initializeElements
  }
}
