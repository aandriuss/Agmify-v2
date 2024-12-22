import { ref, computed } from 'vue'
import type {
  ElementData,
  ViewerTree,
  TreeNode,
  ViewerNode,
  ViewerNodeRaw,
  WorldTreeRoot,
  SelectedParameter
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
   * Phase 2: Collect values only for selected parameters
   */
  function collectSelectedParameterValues(
    nodeData: ViewerNodeRaw,
    selectedParams: string[]
  ): Record<string, ParameterValue> {
    const parameters: Record<string, ParameterValue> = {}

    if (nodeData.parameters) {
      Object.entries(nodeData.parameters).forEach(([key, value]) => {
        if (selectedParams.includes(key)) {
          parameters[key] = convertToParameterValue(value)
        }
      })
    }

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

    const category =
      (nodeData.Other as { Category?: string })?.Category ||
      nodeData.speckle_type ||
      nodeData.type ||
      'Uncategorized'
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
      category: category as string,
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
  function collectNodeParameters(
    node: ViewerNode,
    categoryParams: Map<string, Set<string>>,
    nodeParams: Map<string, Record<string, unknown>>
  ): void {
    const nodeData = node.model?.raw
    if (!nodeData || isSpeckleReference(nodeData)) return

    const category =
      (nodeData.Other as { Category?: string })?.Category ||
      nodeData.speckle_type ||
      nodeData.type ||
      'Uncategorized'

    // Store node parameters for later use
    if (nodeData.parameters) {
      const nodeId = getNodeProperty(nodeData, 'id', '')
      if (nodeId) {
        nodeParams.set(nodeId, nodeData.parameters)
      }

      // Add parameters to category set
      if (!categoryParams.has(category)) {
        categoryParams.set(category, new Set())
      }
      Object.keys(nodeData.parameters).forEach((key) => {
        if (!key.startsWith('__')) {
          categoryParams.get(category)?.add(key)
        }
      })
    }

    // Recursively process elements array
    const elements = nodeData.elements as ViewerNodeRaw[] | undefined
    if (Array.isArray(elements)) {
      elements.forEach((element) => {
        if (isViewerNodeRaw(element)) {
          const elementNode = createViewerNode(element)
          collectNodeParameters(elementNode, categoryParams, nodeParams)
        }
      })
    }

    // Recursively process children array
    const children = node.children as ViewerNode[] | undefined
    if (Array.isArray(children)) {
      children.forEach((child) => {
        if (child) {
          collectNodeParameters(child, categoryParams, nodeParams)
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
      const nodeMap = new Map<string, ViewerNode>()

      // First traverse tree to discover parameters
      const nodeParams = new Map<string, Record<string, unknown>>()
      for (const node of worldTree._root.children || []) {
        if (node) {
          try {
            collectNodeParameters(node, categoryParams, nodeParams)
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
        nodeCount: nodeParams.size
      })

      // Process discovered parameters by category
      debug.startState(DebugCategories.DATA, 'Processing discovered parameters')
      const processedParams = new Map<
        string,
        {
          isChild: boolean
          params: Array<{
            id: string
            name: string
            value: null
            sourceGroup: string
            metadata: {
              category: string
              fullKey: string
              isSystem: boolean
              group: string
            }
          }>
        }
      >()

      categoryParams.forEach((params, category) => {
        const isChild = options.childCategories.includes(category)
        const rawParams = Array.from(params).map((paramKey) => {
          const parts = paramKey.split('.')
          const name = parts.pop() || paramKey
          const group = parts.length > 0 ? parts.join('.') : 'Ungrouped'

          return {
            id: paramKey,
            name,
            value: null,
            sourceGroup: group,
            metadata: {
              category,
              fullKey: paramKey,
              isSystem: false,
              group
            }
          }
        })

        processedParams.set(category, { isChild, params: rawParams })
      })

      // Phase 2: Process Elements and Update Stores
      debug.startState(DebugCategories.DATA, 'Phase 2: Processing Elements')

      // First update parameter store
      const parentParams: Array<{
        id: string
        name: string
        value: null
        sourceGroup: string
        metadata: {
          category: string
          fullKey: string
          isSystem: boolean
          group: string
        }
      }> = []

      const childParams: Array<{
        id: string
        name: string
        value: null
        sourceGroup: string
        metadata: {
          category: string
          fullKey: string
          isSystem: boolean
          group: string
        }
      }> = []

      processedParams.forEach(({ isChild, params }) => {
        if (isChild) {
          childParams.push(...params)
        } else {
          parentParams.push(...params)
        }
      })

      // Update parameter store once for each type
      if (parentParams.length) {
        debug.log(DebugCategories.PARAMETERS, 'Processing parent parameters', {
          count: parentParams.length
        })
        parameterStore.processRawParameters(parentParams, true)
      }
      if (childParams.length) {
        debug.log(DebugCategories.PARAMETERS, 'Processing child parameters', {
          count: childParams.length
        })
        parameterStore.processRawParameters(childParams, false)
      }

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
            nodeMap.set(nodeId, node)
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

            element.parameters = collectSelectedParameterValues(
              nodeData,
              selectedParams
            )

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
