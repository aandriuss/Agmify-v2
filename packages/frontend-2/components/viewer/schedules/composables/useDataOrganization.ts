import { ref } from 'vue'
import type { TreeItemComponentModel, BIMNode } from '../types'
import { debug, DebugCategories } from '../debug/useDebug'

export function useDataOrganization() {
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
      if (!node.rawNode) return
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
      if (!node.rawNode) return
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
        id: 'ungrouped',
        label: 'Ungrouped',
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

    return organizedNodes
  }

  // Function to update root nodes
  const updateRootNodes = async (nodes: TreeItemComponentModel[]): Promise<void> => {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting node organization')

    try {
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
        debug.completeState(
          DebugCategories.INITIALIZATION,
          'BIM elements initialized',
          {
            nodesCount: rootNodes.value.length,
            orphanedCount:
              rootNodes.value.find((n) => n.id === 'ungrouped')?.children?.length || 0
          }
        )
      }

      // Wait for Vue to update the DOM
      await new Promise((resolve) => setTimeout(resolve, 0))

      debug.completeState(
        DebugCategories.DATA_TRANSFORM,
        'Node organization complete',
        {
          totalNodes: nodes.length,
          validNodes: validNodes.length,
          organizedNodes: organizedNodes.length,
          orphanedNodes:
            organizedNodes.find((n) => n.id === 'ungrouped')?.children?.length || 0
        }
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Error organizing nodes:', err)
      throw err
    }
  }

  // Function to check if data is ready
  const isDataReady = () => {
    const ready = isInitialized && rootNodes.value.length > 0
    if (!ready) {
      debug.warn(DebugCategories.STATE, 'Data not ready', {
        isInitialized,
        hasNodes: rootNodes.value.length > 0
      })
    }
    return ready
  }

  return {
    rootNodes,
    updateRootNodes,
    isDataReady
  }
}
