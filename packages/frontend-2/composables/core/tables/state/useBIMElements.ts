import { ref, computed } from 'vue'
import type {
  ElementData,
  ViewerTree,
  TreeNode,
  BIMNodeRaw
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { isValidBIMNodeRaw } from '~/composables/core/types/viewer'

interface BIMElementsState {
  elements: ElementData[]
  worldTree: ViewerTree | null
  treeNodes: TreeNode[]
  isLoading: boolean
  error: Error | null
}

/**
 * BIM elements composable
 * Handles BIM element initialization and state management
 */
export function useBIMElements() {
  // State
  const state = ref<BIMElementsState>({
    elements: [],
    worldTree: null,
    treeNodes: [],
    isLoading: false,
    error: null
  })

  // Computed properties
  const allElements = computed(() => state.value.elements)
  const rawWorldTree = computed(() => state.value.worldTree)
  const rawTreeNodes = computed(() => state.value.treeNodes)
  const isLoading = computed(() => state.value.isLoading)
  const hasError = computed(() => !!state.value.error)

  /**
   * Process a BIM node
   */
  function processBIMNode(node: BIMNodeRaw): ElementData {
    if (!isValidBIMNodeRaw(node)) {
      throw new Error('Invalid BIM node')
    }

    return {
      id: node.id,
      name: node.type,
      field: node.id,
      header: node.type,
      type: 'string',
      visible: true,
      removable: true,
      parameters: {},
      metadata: {},
      isChild: false,
      details: []
    }
  }

  /**
   * Mock data loading
   */
  async function loadMockData(): Promise<{
    elements: ElementData[]
    worldTree: ViewerTree
    treeNodes: TreeNode[]
  }> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    const mockNode: BIMNodeRaw = {
      id: 'root',
      type: 'Root',
      parameters: {}
    }

    const element = processBIMNode(mockNode)
    const worldTree: ViewerTree = {
      id: 'root',
      children: [],
      data: mockNode
    }
    const treeNode: TreeNode = {
      id: 'root',
      children: [],
      data: mockNode,
      level: 0
    }

    return {
      elements: [element],
      worldTree,
      treeNodes: [treeNode]
    }
  }

  /**
   * Initialize BIM elements
   */
  async function initializeElements(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
      state.value.isLoading = true
      state.value.error = null

      // Load mock data
      const { elements, worldTree, treeNodes } = await loadMockData()

      // Update state
      state.value.elements = elements
      state.value.worldTree = worldTree
      state.value.treeNodes = treeNodes

      debug.completeState(DebugCategories.INITIALIZATION, 'BIM elements initialized', {
        elementCount: elements.length,
        hasWorldTree: !!worldTree,
        nodeCount: treeNodes.length
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
    // This would be implemented when we have actual world tree watching
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
