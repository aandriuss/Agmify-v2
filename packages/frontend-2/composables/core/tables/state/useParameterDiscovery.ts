import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  TreeItemComponentModel,
  AvailableParameter,
  AvailableBimParameter,
  BIMNodeData,
  RawParameter
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { isValidBIMNodeData } from '~/composables/core/types/viewer/viewer-base'
import {
  createAvailableBimParameter,
  isElementParameter
} from '~/composables/core/types/parameters/parameter-states'
import { inferParameterType } from '~/composables/core/parameters/utils/group-processing'
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
      const elementType = param.metadata?.elementType?.toString() || 'Uncategorized'
      return options.selectedParentCategories.value.includes(elementType)
    })
  )

  const availableChildHeaders = computed(() =>
    state.value.discoveredParameters.child.filter((param) => {
      const elementType = param.metadata?.elementType?.toString() || 'Uncategorized'
      return options.selectedChildCategories.value.includes(elementType)
    })
  )

  const isDiscovering = computed(() => state.value.discovering)
  const discoveryProgress = computed(() => state.value.progress)
  const discoveryError = computed(() => state.value.error)

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
  function convertToAvailableParameters(
    elements: BIMNodeData[]
  ): AvailableBimParameter[] {
    // Extract raw parameters and their groups from elements
    const parameters: AvailableBimParameter[] = []
    const processedParams = new Set<string>() // Track processed parameter names

    elements.forEach((element) => {
      if (!element.parameters) return

      Object.entries(element.parameters).forEach(([paramName, paramData]) => {
        // Skip if we've already processed this parameter
        if (processedParams.has(paramName)) return

        try {
          // Ensure paramData is an ElementParameter
          if (!isElementParameter(paramData)) {
            debug.warn(
              DebugCategories.PARAMETERS,
              `Invalid parameter data for ${paramName}`,
              paramData
            )
            return
          }

          const paramType = inferParameterType(paramData.value)

          // Create raw parameter using existing group info
          const rawParam: RawParameter = {
            id: paramName,
            name: paramName,
            value: paramData.value,
            group: paramData.group,
            metadata: {
              category: element.type || 'Uncategorized',
              elementId: element.id || '',
              elementType: element.type || 'Unknown',
              fullKey: paramName,
              isNested: false
            }
          }

          // Create parameter using utility function
          const param = createAvailableBimParameter(
            rawParam,
            paramType,
            paramData.value
          )

          parameters.push(param)
          processedParams.add(paramName)
        } catch (err) {
          debug.warn(
            DebugCategories.PARAMETERS,
            `Failed to process parameter ${paramName}:`,
            err instanceof Error ? err : new Error(String(err))
          )
        }
      })
    })

    return parameters
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
        const elementType = param.metadata?.elementType?.toString() || 'Uncategorized'

        // Add to appropriate list based on element type
        if (options.selectedParentCategories.value.includes(elementType)) {
          parentParams.push(param)
        } else if (options.selectedChildCategories.value.includes(elementType)) {
          childParams.push(param)
        }
      })

      // Add user parameters if provided
      if (options.userParameters) {
        options.userParameters.forEach((param) => {
          const elementType = param.metadata?.elementType?.toString() || 'Uncategorized'
          if (options.selectedParentCategories.value.includes(elementType)) {
            parentParams.push(param)
          } else if (options.selectedChildCategories.value.includes(elementType)) {
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
