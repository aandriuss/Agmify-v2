import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  TreeItemComponentModel,
  AvailableParameter,
  AvailableBimParameter,
  BimValueType,
  ParameterValue,
  BIMNodeData
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { isValidBIMNodeData } from '~/composables/core/types/viewer/viewer-base'
import {
  extractRawParameters,
  extractParameterGroups
} from '../../parameters/utils/parameter-extraction'
import { createAvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import type {
  BaseParameterDiscoveryOptions,
  BaseParameterDiscoveryState,
  DiscoveryProgressEvent,
  ParameterDiscoveryEvents
} from '../../types/parameters/discovery-types'

interface UseParameterDiscoveryOptions extends BaseParameterDiscoveryOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  userParameters?: AvailableParameter[] // Optional user-defined parameters
}

interface ParameterDiscoveryState extends BaseParameterDiscoveryState {
  discoveredParameters: {
    parent: AvailableParameter[]
    child: AvailableParameter[]
  }
}

interface ParameterDiscoveryReturn {
  // Available parameters
  availableParentHeaders: ComputedRef<AvailableParameter[]>
  availableChildHeaders: ComputedRef<AvailableParameter[]>

  // Discovery state
  isDiscovering: ComputedRef<boolean>
  discoveryProgress: ComputedRef<DiscoveryProgressEvent>
  discoveryError: ComputedRef<Error | null>

  // Methods
  discoverParameters: (root: TreeItemComponentModel) => Promise<void>
}

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
    state.value.discoveredParameters.parent.filter((param) => {
      const elementType = param.metadata?.elementType as string
      return options.selectedParentCategories.value.includes(
        elementType || 'Uncategorized'
      )
    })
  )

  const availableChildHeaders = computed(() =>
    state.value.discoveredParameters.child.filter((param) => {
      const elementType = param.metadata?.elementType as string
      return options.selectedChildCategories.value.includes(
        elementType || 'Uncategorized'
      )
    })
  )

  const isDiscovering = computed(() => state.value.discovering)
  const discoveryProgress = computed(() => state.value.progress)
  const discoveryError = computed(() => state.value.error)

  /**
   * Process a single BIM node
   */
  /**
   * Extract elements from node data
   */
  function extractElements(node: TreeItemComponentModel): BIMNodeData[] {
    if (!node.rawNode?.data || !isValidBIMNodeData(node.rawNode.data)) {
      debug.warn(DebugCategories.PARAMETERS, 'Invalid node data', { node })
      return []
    }

    const elements: BIMNodeData[] = []
    const nodeData = node.rawNode.data

    // Add root node if it has parameters
    if (nodeData.parameters) {
      elements.push(nodeData)
    }

    // Add child nodes recursively
    if (node.children?.length) {
      node.children.forEach((child) => {
        elements.push(...extractElements(child))
      })
    }

    return elements
  }

  /**
   * Convert extracted parameters to available parameters
   */
  async function convertToAvailableParameters(
    elements: BIMNodeData[]
  ): Promise<AvailableBimParameter[]> {
    // Extract raw parameters
    const rawParams = extractRawParameters(elements)
    const _groups = await extractParameterGroups(elements)

    // Create raw parameters with proper metadata
    const processedRawParams = rawParams.map((param) => ({
      id: param.id,
      name: param.name,
      value: param.value as ParameterValue,
      fetchedGroup: param.group || 'Parameters',
      metadata: {
        ...param.metadata,
        category: param.category,
        group: param.group
      }
    }))

    // Convert to BIM parameters
    return processedRawParams.map((raw) => {
      const type = inferParameterType(raw.value)
      return createAvailableBimParameter(raw, type, raw.value)
    })
  }

  /**
   * Infer parameter type from value
   */
  function inferParameterType(value: unknown): BimValueType {
    if (value === null || value === undefined) return 'string'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (value instanceof Date) return 'date'
    if (Array.isArray(value)) return 'array'
    if (typeof value === 'object') return 'object'
    return 'string'
  }

  /**
   * Main discovery function
   */
  async function discoverParameters(root: TreeItemComponentModel): Promise<void> {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Starting parameter discovery')
      state.value.discovering = true
      events?.onStart?.()

      // Extract all elements from the tree
      const elements = extractElements(root)

      // Convert to available parameters
      const availableParams = await convertToAvailableParameters(elements)

      // Split parameters by category
      const parentParams: AvailableParameter[] = []
      const childParams: AvailableParameter[] = []

      // Sort parameters by element type while preserving groups
      availableParams.forEach((param) => {
        const elementType = (param.metadata?.elementType as string) || 'Uncategorized'
        const group = String(
          param.metadata?.originalGroup || param.fetchedGroup || 'Parameters'
        )

        // Create parameter with proper group assignments
        const paramWithGroups: AvailableParameter = {
          ...param,
          fetchedGroup: group,
          currentGroup: group,
          metadata: {
            ...param.metadata,
            elementType,
            originalGroup: group
          }
        }

        // Add to appropriate list based on element type
        if (options.selectedParentCategories.value.includes(elementType)) {
          parentParams.push(paramWithGroups)
        } else if (options.selectedChildCategories.value.includes(elementType)) {
          childParams.push(paramWithGroups)
        }
      })

      // Add user parameters if provided
      if (options.userParameters) {
        options.userParameters.forEach((param) => {
          const category = param.category || 'Uncategorized'
          if (options.selectedParentCategories.value.includes(category)) {
            parentParams.push(param)
          } else if (options.selectedChildCategories.value.includes(category)) {
            childParams.push(param)
          }
        })
      }

      // Update state
      state.value.discoveredParameters = {
        parent: parentParams,
        child: childParams
      }

      events?.onComplete?.([...parentParams, ...childParams])

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
        parentCount: parentParams.length,
        childCount: childParams.length,
        userParameters: options.userParameters?.length || 0
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
