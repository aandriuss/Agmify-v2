import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { useParameterDiscovery } from '~/composables/core/tables/state/useParameterDiscovery'
import type { Parameter } from '~/composables/core/types/parameters/parameter-types'
import type { TreeItemComponentModel } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

interface BIMParameterDiscoveryOptions {
  selectedParentCategories: Ref<string[]>
  selectedChildCategories: Ref<string[]>
  onError?: (error: Error) => void
}

/**
 * BIM-specific parameter discovery
 * Wraps core parameter discovery with BIM-specific functionality
 */
export function useBIMParameterDiscovery(options: BIMParameterDiscoveryOptions) {
  // Initialize core discovery
  const discovery = useParameterDiscovery(
    {
      selectedParentCategories: options.selectedParentCategories,
      selectedChildCategories: options.selectedChildCategories,
      onError: options.onError
    },
    {
      onStart: () => {
        debug.log(DebugCategories.PARAMETERS, 'Starting BIM parameter discovery')
      },
      onComplete: (parameters) => {
        debug.log(DebugCategories.PARAMETERS, 'BIM parameter discovery complete', {
          parameterCount: parameters.length
        })
      },
      onError: (error) => {
        debug.error(DebugCategories.ERROR, 'BIM parameter discovery failed:', error)
        options.onError?.(error)
      }
    }
  )

  // BIM-specific state
  const bimParameters = ref<Parameter[]>([])

  // Computed properties
  const availableParentHeaders = computed<Parameter[]>(() =>
    discovery.availableParentHeaders.value.filter((param) => param.kind === 'bim')
  )

  const availableChildHeaders = computed<Parameter[]>(() =>
    discovery.availableChildHeaders.value.filter((param) => param.kind === 'bim')
  )

  /**
   * Discover BIM parameters from tree
   */
  async function discoverParameters(root: TreeItemComponentModel): Promise<void> {
    try {
      await discovery.discoverParameters(root)
      bimParameters.value = [
        ...discovery.availableParentHeaders.value,
        ...discovery.availableChildHeaders.value
      ].filter((param) => param.kind === 'bim')
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error('BIM parameter discovery failed')
      debug.error(DebugCategories.ERROR, 'BIM parameter discovery failed:', error)
      options.onError?.(error)
      throw error
    }
  }

  return {
    // Core discovery state
    isDiscoveringParent: discovery.isDiscovering,
    isDiscoveringChild: computed(() => false), // BIM discovery is single-phase
    parentDiscoveryProgress: discovery.discoveryProgress,
    childDiscoveryProgress: computed(() => ({
      processed: 0,
      total: 0,
      remaining: 0,
      parameters: 0
    })),
    parentDiscoveryError: discovery.discoveryError,
    childDiscoveryError: computed(() => null),

    // BIM-specific state
    bimParameters: computed(() => bimParameters.value),
    availableParentHeaders,
    availableChildHeaders,

    // Methods
    discoverParameters
  }
}
