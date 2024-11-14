import { ref } from 'vue'
import type { TreeItemComponentModel } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

interface WorldTreeNode {
  _root?: {
    type?: string
    children?: TreeItemComponentModel[]
  }
}

// Validation function for world tree nodes - simplified
function isValidWorldTreeNode(node: TreeItemComponentModel): boolean {
  const hasRawNode = !!node.rawNode
  const hasRaw = !!node.rawNode?.raw
  const hasId =
    typeof node.rawNode?.raw?.id === 'string' ||
    typeof node.rawNode?.raw?.id === 'number'

  // Log detailed validation info for debugging
  debug.log(DebugCategories.VALIDATION, 'Validating world tree node:', {
    hasRawNode,
    hasRaw,
    hasId,
    raw: node.rawNode?.raw,
    speckleType: node.rawNode?.raw?.speckle_type,
    category: node.rawNode?.raw?.Other?.Category,
    mark:
      node.rawNode?.raw?.['Identity Data']?.Mark ||
      node.rawNode?.raw?.Tag ||
      node.rawNode?.raw?.Mark,
    host: node.rawNode?.raw?.Constraints?.Host
  })

  // Node is valid if it has raw data and an ID
  const isValid = hasRawNode && hasRaw && hasId
  if (!isValid) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid node:', {
      raw: node.rawNode?.raw,
      reason: {
        noRawNode: !hasRawNode,
        noRaw: !hasRaw,
        noId: !hasId
      }
    })
  }

  return isValid
}

// Helper function to traverse tree and collect valid nodes
function collectValidNodes(node: TreeItemComponentModel): TreeItemComponentModel[] {
  const validNodes: TreeItemComponentModel[] = []

  // Helper function to recursively traverse the tree
  function traverse(currentNode: TreeItemComponentModel) {
    // Always include the node if it has basic valid structure
    if (currentNode.rawNode?.raw) {
      validNodes.push(currentNode)
    }

    // Recursively check children
    if (currentNode.children && currentNode.children.length > 0) {
      for (const child of currentNode.children) {
        traverse(child)
      }
    }
  }

  traverse(node)
  return validNodes
}

export function useScheduleInitialization() {
  const loadingError = ref<Error | null>(null)
  const {
    metadata: { worldTree }
  } = useInjectedViewer()

  async function initializeData(): Promise<void> {
    try {
      debug.startState('dataInit')
      debug.log(DebugCategories.INITIALIZATION, 'Starting data initialization')

      // Wait for WorldTree to be available
      let retryCount = 0
      while (!worldTree.value?._root?.children && retryCount < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retryCount++
        if (retryCount % 10 === 0) {
          debug.log(DebugCategories.INITIALIZATION, '⏳ Waiting for WorldTree...', {
            retryCount,
            hasTree: !!worldTree.value,
            hasRoot: !!worldTree.value?._root,
            metadata: worldTree.value
          })
        }
      }

      const tree = worldTree.value as WorldTreeNode | undefined
      if (!tree?._root?.children) {
        debug.error(DebugCategories.ERROR, 'No WorldTree data available', {
          tree,
          metadata: worldTree.value
        })
        throw new Error('No WorldTree data available')
      }

      const children = tree._root.children

      // Log raw tree data for debugging
      debug.log(DebugCategories.DATA, 'Raw WorldTree data:', {
        rootType: tree._root.type,
        childCount: children.length,
        firstChild: children[0]?.rawNode?.raw,
        structure: children.map((node: TreeItemComponentModel) => ({
          id: node.rawNode?.raw?.id,
          type: node.rawNode?.raw?.type,
          speckleType: node.rawNode?.raw?.speckle_type,
          category: node.rawNode?.raw?.Other?.Category,
          childCount: node.children?.length
        }))
      })

      // Collect all nodes by traversing the tree
      const allNodes = children.reduce((acc, child) => {
        return acc.concat(collectValidNodes(child))
      }, [] as TreeItemComponentModel[])

      // Filter to valid nodes
      const validNodes = allNodes.filter(isValidWorldTreeNode)

      debug.log(DebugCategories.DATA, 'Node collection results:', {
        totalNodes: allNodes.length,
        validNodes: validNodes.length,
        invalidNodes: allNodes.length - validNodes.length,
        nodeTypes: [...new Set(allNodes.map((n) => n.rawNode?.raw?.type))],
        speckleTypes: [...new Set(allNodes.map((n) => n.rawNode?.raw?.speckle_type))],
        categories: [...new Set(allNodes.map((n) => n.rawNode?.raw?.Other?.Category))]
      })

      if (validNodes.length === 0) {
        debug.error(DebugCategories.ERROR, 'No valid nodes found', {
          totalNodes: allNodes.length,
          sampleNodes: allNodes.slice(0, 3).map((node) => ({
            raw: node.rawNode?.raw,
            validation: {
              hasRawNode: !!node.rawNode,
              hasRaw: !!node.rawNode?.raw,
              hasId: typeof node.rawNode?.raw?.id !== 'undefined'
            }
          }))
        })
        // Don't throw error, just log warning
        debug.warn(DebugCategories.VALIDATION, 'No valid nodes, but continuing')
      }

      debug.log(DebugCategories.INITIALIZATION, '🌳 WorldTree data processed:', {
        rootType: tree._root.type,
        totalNodes: allNodes.length,
        validNodes: validNodes.length,
        categories: [
          ...new Set(
            validNodes.map(
              (node: TreeItemComponentModel) => node.rawNode?.raw?.Other?.Category
            )
          )
        ],
        nodeSample: validNodes.slice(0, 3).map((node) => ({
          type: node.rawNode?.raw?.speckle_type,
          category: node.rawNode?.raw?.Other?.Category,
          id: node.rawNode?.raw?.id
        }))
      })

      debug.completeState('dataInit')
    } catch (err) {
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to initialize data')
      debug.error(DebugCategories.ERROR, 'Initialization error:', err)
      throw loadingError.value
    }
  }

  async function waitForData<T>(
    getValue: () => T | undefined | null,
    validate: (value: T) => boolean,
    timeout = 10000
  ): Promise<T> {
    debug.startState('dataWait')
    const start = Date.now()
    let value = getValue()
    let attempts = 0

    while ((!value || !validate(value)) && Date.now() - start < timeout) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 100))
      value = getValue()

      // Log progress every second
      if (attempts % 10 === 0) {
        debug.log(DebugCategories.INITIALIZATION, 'Waiting for data:', {
          hasValue: !!value,
          isValid: value ? validate(value) : false,
          elapsed: Date.now() - start,
          attempts,
          remainingTime: timeout - (Date.now() - start)
        })
      }
    }

    if (!value || !validate(value)) {
      debug.error(DebugCategories.ERROR, 'Data wait timeout:', {
        hasValue: !!value,
        isValid: value ? validate(value) : false,
        elapsed: Date.now() - start,
        attempts
      })

      const error = new Error('Timeout waiting for data')
      loadingError.value = error
      debug.completeState('dataWait')
      throw error
    }

    debug.log(DebugCategories.INITIALIZATION, 'Data ready:', {
      elapsed: Date.now() - start,
      attempts,
      dataType: typeof value,
      isArray: Array.isArray(value),
      length: Array.isArray(value) ? value.length : null
    })

    debug.completeState('dataWait')
    return value
  }

  return {
    loadingError,
    initializeData,
    waitForData
  }
}
