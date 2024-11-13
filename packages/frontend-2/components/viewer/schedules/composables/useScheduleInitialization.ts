import { ref } from 'vue'
import type { TreeItemComponentModel } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

// Validation function for world tree nodes
function isValidWorldTreeNode(node: TreeItemComponentModel): boolean {
  const hasRawNode = !!node.rawNode
  const hasRaw = !!node.rawNode?.raw
  const hasSpeckleType = typeof node.rawNode?.raw?.speckle_type === 'string'
  const hasCategory = typeof node.rawNode?.raw?.Other?.Category === 'string'

  debug.log(DebugCategories.VALIDATION, 'Validating world tree node:', {
    hasRawNode,
    hasRaw,
    hasSpeckleType,
    hasCategory,
    speckleType: node.rawNode?.raw?.speckle_type,
    category: node.rawNode?.raw?.Other?.Category
  })

  return hasRawNode && hasRaw && hasSpeckleType && hasCategory
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
            hasRoot: !!worldTree.value?._root
          })
        }
      }

      const tree = worldTree.value
      if (!tree?._root?.children) {
        debug.error(DebugCategories.ERROR, 'No WorldTree data available')
        throw new Error('No WorldTree data available')
      }

      // Validate world tree data
      const validNodes = tree._root.children.filter(isValidWorldTreeNode)
      if (validNodes.length === 0) {
        debug.error(DebugCategories.ERROR, 'No valid nodes in WorldTree', {
          totalNodes: tree._root.children.length,
          firstNode: tree._root.children[0],
          firstNodeRaw: tree._root.children[0]?.rawNode?.raw
        })
        throw new Error('No valid nodes in WorldTree')
      }

      debug.log(DebugCategories.INITIALIZATION, '🌳 WorldTree data validated:', {
        rootType: tree._root.type,
        totalNodes: tree._root.children.length,
        validNodes: validNodes.length,
        categories: validNodes.map((node) => node.rawNode?.raw?.Other?.Category),
        firstValidNode: {
          type: validNodes[0].rawNode?.raw?.speckle_type,
          category: validNodes[0].rawNode?.raw?.Other?.Category
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
