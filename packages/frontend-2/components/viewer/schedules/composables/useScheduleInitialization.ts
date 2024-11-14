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

// Validation function for world tree nodes
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

  // Node is valid if it has raw data and at least an ID
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
        allChildren: children.map((node: TreeItemComponentModel) => ({
          raw: node.rawNode?.raw,
          childCount: node.children?.length,
          validation: {
            hasRawNode: !!node.rawNode,
            hasRaw: !!node.rawNode?.raw,
            hasId:
              typeof node.rawNode?.raw?.id === 'string' ||
              typeof node.rawNode?.raw?.id === 'number'
          }
        }))
      })

      // Validate world tree data
      const validNodes = children.filter(isValidWorldTreeNode)
      if (validNodes.length === 0) {
        debug.error(DebugCategories.ERROR, 'No valid nodes in WorldTree', {
          totalNodes: children.length,
          firstNode: children[0],
          firstNodeRaw: children[0]?.rawNode?.raw,
          allNodes: children.map((node: TreeItemComponentModel) => ({
            raw: node.rawNode?.raw,
            validation: {
              hasRawNode: !!node.rawNode,
              hasRaw: !!node.rawNode?.raw,
              hasId:
                typeof node.rawNode?.raw?.id === 'string' ||
                typeof node.rawNode?.raw?.id === 'number'
            }
          }))
        })
        throw new Error('No valid nodes in WorldTree')
      }

      debug.log(DebugCategories.INITIALIZATION, '🌳 WorldTree data validated:', {
        rootType: tree._root.type,
        totalNodes: children.length,
        validNodes: validNodes.length,
        categories: [
          ...new Set(
            validNodes.map(
              (node: TreeItemComponentModel) => node.rawNode?.raw?.Other?.Category
            )
          )
        ],
        firstValidNode: validNodes[0] && {
          type: validNodes[0].rawNode?.raw?.speckle_type,
          category: validNodes[0].rawNode?.raw?.Other?.Category,
          id: validNodes[0].rawNode?.raw?.id,
          mark:
            validNodes[0].rawNode?.raw?.['Identity Data']?.Mark ||
            validNodes[0].rawNode?.raw?.Tag ||
            validNodes[0].rawNode?.raw?.Mark,
          host: validNodes[0].rawNode?.raw?.Constraints?.Host
        }
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
          remainingTime: timeout - (Date.now() - start),
          currentValue: value ? JSON.stringify(value).slice(0, 200) + '...' : 'null'
        })
      }

      // If we have a value but it's invalid, log details
      if (value && !validate(value)) {
        debug.warn(DebugCategories.VALIDATION, 'Invalid data received:', {
          value:
            typeof value === 'object'
              ? JSON.stringify(value, null, 2).slice(0, 200) + '...'
              : value,
          validationResult: validate(value)
        })
      }
    }

    if (!value || !validate(value)) {
      debug.error(DebugCategories.ERROR, 'Data wait timeout:', {
        hasValue: !!value,
        isValid: value ? validate(value) : false,
        elapsed: Date.now() - start,
        attempts,
        value: value ? JSON.stringify(value, null, 2).slice(0, 200) + '...' : 'null'
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
      length: Array.isArray(value) ? value.length : null,
      value: JSON.stringify(value).slice(0, 200) + '...'
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
