import { ref, onMounted } from 'vue'
import type { TreeItemComponentModel, BIMNode } from '../types'
import { debug, DebugCategories } from '../utils/debug'

export function useDataOrganization() {
  debug.startState('dataOrganization')
  const rootNodes = ref<TreeItemComponentModel[]>([])
  let isInitialized = false

  // Helper function to extract host information
  function getHostInfo(node: BIMNode) {
    const raw = node.raw
    const constraints = raw.Constraints || {}
    return {
      mark: String(raw.Mark || ''),
      host: String(constraints.Host || ''),
      category: String(
        raw.Other?.Category || raw.speckleType || raw.type || 'Uncategorized'
      )
    }
  }

  // Helper function to organize nodes by host/mark relationships
  function organizeNodesByHost(
    nodes: TreeItemComponentModel[]
  ): TreeItemComponentModel[] {
    const markToNodeMap = new Map<string, TreeItemComponentModel>()
    const hostToChildrenMap = new Map<string, TreeItemComponentModel[]>()
    const orphanedNodes: TreeItemComponentModel[] = []

    // First pass: create maps for quick lookup
    nodes.forEach((node) => {
      const { mark, host } = getHostInfo(node.rawNode)

      if (mark) {
        markToNodeMap.set(mark, node)
      }

      if (host) {
        if (!hostToChildrenMap.has(host)) {
          hostToChildrenMap.set(host, [])
        }
        const children = hostToChildrenMap.get(host)
        if (children) {
          children.push(node)
        }
      }
    })

    // Second pass: organize nodes
    const organizedNodes: TreeItemComponentModel[] = []
    nodes.forEach((node) => {
      const { mark, host } = getHostInfo(node.rawNode)

      if (!host) {
        // This is a parent node
        const children = hostToChildrenMap.get(mark) || []
        node.children = children
        organizedNodes.push(node)
      } else if (!markToNodeMap.has(host)) {
        // This is an orphaned child
        orphanedNodes.push(node)
      }
    })

    // Handle orphaned nodes
    if (orphanedNodes.length > 0) {
      const ungroupedParent: TreeItemComponentModel = {
        rawNode: {
          raw: {
            id: 'ungrouped',
            Mark: 'Ungrouped',
            type: 'Ungrouped',
            Other: { Category: 'Ungrouped' }
          }
        },
        children: orphanedNodes
      }
      organizedNodes.push(ungroupedParent)
    }

    debug.log(DebugCategories.DATA, 'Nodes organized by host:', {
      totalNodes: nodes.length,
      parentNodes: organizedNodes.length,
      orphanedNodes: orphanedNodes.length,
      hostRelationships: Array.from(hostToChildrenMap.entries()).map(
        ([host, children]) => ({
          host,
          childrenCount: children.length
        })
      )
    })

    return organizedNodes
  }

  // Function to update root nodes
  const updateRootNodes = async (nodes: TreeItemComponentModel[]): Promise<void> => {
    debug.startState('updateRootNodes')

    try {
      debug.log(DebugCategories.DATA, 'Updating root nodes:', {
        nodesLength: nodes?.length,
        firstNode: nodes?.[0],
        isArray: Array.isArray(nodes)
      })

      if (!nodes || !Array.isArray(nodes)) {
        throw new Error('Invalid nodes provided to updateRootNodes')
      }

      // Validate node structure
      const validNodes = nodes.filter((node) => {
        const isValid = node && node.rawNode && node.rawNode.raw
        if (!isValid) {
          debug.warn(DebugCategories.VALIDATION, 'Invalid node structure:', node)
        }
        return isValid
      })

      // Organize nodes by host/mark relationships
      const organizedNodes = organizeNodesByHost(validNodes)

      // Ensure we have valid data before updating
      if (organizedNodes.length === 0) {
        throw new Error('No valid nodes found in update')
      }

      // Update the ref with organized nodes
      rootNodes.value = organizedNodes

      // Mark as initialized after first successful update
      if (!isInitialized) {
        isInitialized = true
        debug.log(DebugCategories.INITIALIZATION, 'Data organization initialized', {
          nodesCount: rootNodes.value.length,
          nodeCategories: rootNodes.value.map(
            (node) => getHostInfo(node.rawNode).category
          )
        })
      }

      debug.log(DebugCategories.DATA, 'Root nodes updated:', {
        nodesLength: rootNodes.value.length,
        nodeCategories: rootNodes.value.map(
          (node) => getHostInfo(node.rawNode).category
        ),
        hostRelationships: rootNodes.value.map((node) => ({
          mark: getHostInfo(node.rawNode).mark,
          childrenCount: node.children?.length || 0
        }))
      })

      // Wait for Vue to update the DOM
      await new Promise((resolve) => setTimeout(resolve, 0))

      debug.completeState('updateRootNodes')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error updating root nodes:', err)
      throw err
    }
  }

  onMounted(() => {
    debug.log(
      DebugCategories.INITIALIZATION,
      'useDataOrganization mounted, current rootNodes:',
      {
        nodesLength: rootNodes.value.length,
        hasNodes: rootNodes.value.length > 0,
        isInitialized
      }
    )
  })

  // Function to check if data is ready
  const isDataReady = () => {
    const ready = isInitialized && rootNodes.value.length > 0
    debug.log(DebugCategories.STATE, 'Checking data readiness:', {
      isInitialized,
      hasNodes: rootNodes.value.length > 0,
      isReady: ready
    })
    return ready
  }

  debug.completeState('dataOrganization')
  return {
    rootNodes,
    updateRootNodes,
    isDataReady
  }
}
