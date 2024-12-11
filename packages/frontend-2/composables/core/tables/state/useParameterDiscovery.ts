import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  ProcessedHeader,
  TreeItemComponentModel,
  Parameter
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { processedHeaderToParameter } from '~/composables/core/utils/conversion/header-conversion'
import { isValidBIMNodeData } from '~/composables/core/types/viewer/viewer-base'
import {
  processInChunks,
  extractParametersFromObject,
  extractMetadataParameters
} from '../../parameters/utils/parameter-processing'
import type {
  BaseParameterDiscoveryOptions,
  BaseParameterDiscoveryState,
  DiscoveryProgressEvent,
  ParameterDiscoveryEvents
} from '../../types/parameters/discovery-types'

interface UseParameterDiscoveryOptions extends BaseParameterDiscoveryOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
}

interface ParameterDiscoveryState extends BaseParameterDiscoveryState {
  discoveredParameters: {
    parent: Parameter[]
    child: Parameter[]
  }
}

interface ParameterDiscoveryReturn {
  // Available parameters
  availableParentHeaders: ComputedRef<Parameter[]>
  availableChildHeaders: ComputedRef<Parameter[]>

  // Discovery state
  isDiscovering: ComputedRef<boolean>
  discoveryProgress: ComputedRef<DiscoveryProgressEvent>
  discoveryError: ComputedRef<Error | null>

  // Methods
  discoverParameters: (root: TreeItemComponentModel) => Promise<void>
}

const DEFAULT_CHUNK_SIZE = 50

/**
 * Parameter discovery composable for BIM data
 * Discovers and processes parameters from BIM elements with parent/child relationships
 */
export function useParameterDiscovery(
  options: UseParameterDiscoveryOptions,
  events?: ParameterDiscoveryEvents
): ParameterDiscoveryReturn {
  // Initialize state
  const state = ref<ParameterDiscoveryState>({
    discoveredParameters: {
      parent: [],
      child: []
    },
    progress: {
      processed: 0,
      total: 0,
      remaining: 0,
      parameters: 0
    },
    discovering: false,
    error: null
  })

  // Computed properties
  const availableParentHeaders = computed(() =>
    state.value.discoveredParameters.parent.filter((param) =>
      options.selectedParentCategories.value.includes(param.category || 'Uncategorized')
    )
  )

  const availableChildHeaders = computed(() =>
    state.value.discoveredParameters.child.filter((param) =>
      options.selectedChildCategories.value.includes(param.category || 'Uncategorized')
    )
  )

  const isDiscovering = computed(() => state.value.discovering)
  const discoveryProgress = computed(() => state.value.progress)
  const discoveryError = computed(() => state.value.error)

  /**
   * Process a single BIM node
   */
  async function processNode(
    node: TreeItemComponentModel,
    isParent: boolean
  ): Promise<ProcessedHeader[]> {
    if (!node.rawNode?.data || !isValidBIMNodeData(node.rawNode.data)) {
      debug.warn(DebugCategories.PARAMETERS, 'Invalid node data', { node })
      return []
    }

    const nodeData = node.rawNode.data
    const category = nodeData.type || (isParent ? 'Parent' : 'Child')

    try {
      // Extract parameters from main data
      const paramHeaders = extractParametersFromObject(
        nodeData.parameters,
        [],
        category
      )

      // Extract metadata if available
      if (nodeData.metadata) {
        const metadataHeaders = extractMetadataParameters(nodeData.metadata, category)
        paramHeaders.push(...metadataHeaders)
      }

      return paramHeaders
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process node:', err)
      return []
    }
  }

  /**
   * Process nodes recursively with chunking
   */
  async function processNodes(
    root: TreeItemComponentModel,
    isParent: boolean
  ): Promise<ProcessedHeader[]> {
    const nodesToProcess: TreeItemComponentModel[] = [root]
    const allHeaders: ProcessedHeader[] = []

    try {
      // Process nodes in chunks
      await processInChunks(
        nodesToProcess,
        async (node) => {
          const headers = await processNode(node, isParent)
          allHeaders.push(...headers)

          // Handle children
          if (node.children?.length) {
            if (!isParent) {
              // For child processing, add all children
              nodesToProcess.push(...node.children)
            } else {
              // For parent processing, only process the root
              const childHeaders = await Promise.all(
                node.children.map((child) => processNode(child, false))
              )
              allHeaders.push(...childHeaders.flat())
            }
          }

          return headers
        },
        options.chunkSize || DEFAULT_CHUNK_SIZE,
        (progress) => {
          state.value.progress = progress
          events?.onProgress?.(progress)
        }
      )

      return allHeaders
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process nodes:', err)
      throw err
    }
  }

  /**
   * Main discovery function
   */
  async function discoverParameters(root: TreeItemComponentModel): Promise<void> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Starting parameter discovery')
      state.value.discovering = true
      events?.onStart?.()

      // Process parent parameters
      const parentHeaders = await processNodes(root, true)
      const parentParams = await Promise.all(
        parentHeaders.map(processedHeaderToParameter)
      )

      // Process child parameters
      const childHeaders = await processNodes(root, false)
      const childParams = await Promise.all(
        childHeaders.map(processedHeaderToParameter)
      )

      // Update state
      state.value.discoveredParameters = {
        parent: parentParams,
        child: childParams
      }

      events?.onComplete?.([...parentParams, ...childParams])

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
        parentCount: parentParams.length,
        childCount: childParams.length
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Parameter discovery failed')
      debug.error(DebugCategories.ERROR, 'Parameter discovery failed:', error)
      state.value.error = error
      events?.onError?.(error)
      throw error
    } finally {
      state.value.discovering = false
    }
  }

  return {
    // Available parameters
    availableParentHeaders,
    availableChildHeaders,

    // Discovery state
    isDiscovering,
    discoveryProgress,
    discoveryError,

    // Methods
    discoverParameters
  }
}
