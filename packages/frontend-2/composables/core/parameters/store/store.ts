import { ref, computed } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { ElementData } from '~/composables/core/types'
import type {
  ParameterStore,
  ParameterStoreState,
  RawParameter,
  AvailableBimParameter
} from './types'
import { parameterCache } from './cache'
import {
  processRawParameters as processParams,
  extractRawParameters,
  convertToParameterValue
} from '../parameter-processing'

/**
 * Create initial store state
 */
function createInitialState(): ParameterStoreState {
  return {
    raw: [],
    collections: {
      available: {
        parent: {
          bim: [],
          user: []
        },
        child: {
          bim: [],
          user: []
        }
      }
    },
    processing: {
      status: 'idle',
      error: null,
      lastAttempt: null
    },
    lastUpdated: Date.now(),
    initialized: false
  }
}

/**
 * Create parameter store
 */
function createParameterStore(): ParameterStore {
  // Internal state
  const state = ref<ParameterStoreState>(createInitialState())

  // Status computeds
  const isProcessing = computed(() => state.value.processing.status === 'processing')
  const hasError = computed(() => state.value.processing.error !== null)
  const lastUpdated = computed(() => state.value.lastUpdated)

  // Parameter computeds
  const rawParameters = computed(() => state.value.raw)
  const parentAvailableBimParameters = computed(
    () => state.value.collections.available.parent.bim
  )
  const parentAvailableUserParameters = computed(
    () => state.value.collections.available.parent.user
  )
  const childAvailableBimParameters = computed(
    () => state.value.collections.available.child.bim
  )
  const childAvailableUserParameters = computed(
    () => state.value.collections.available.child.user
  )

  /**
   * Process parameters from elements
   * Note: This function returns a Promise for API compatibility,
   * even though the current implementation has no async operations.
   * This allows for future async processing without breaking consumers.
   */
  function processParameters(elements: ElementData[]): Promise<void> {
    return Promise.resolve()
      .then(() => {
        debug.startState(DebugCategories.PARAMETERS, 'Processing parameters')
        state.value.processing.status = 'processing'
        state.value.processing.lastAttempt = Date.now()

        // Verify elements have parameters
        const validElements = elements.filter(
          (el) => el.parameters && Object.keys(el.parameters).length > 0
        )

        debug.log(DebugCategories.PARAMETERS, 'Elements with parameters', {
          total: elements.length,
          valid: validElements.length,
          sample: validElements[0]
            ? {
                id: validElements[0].id,
                parameterCount: Object.keys(validElements[0].parameters || {}).length
              }
            : null
        })

        if (validElements.length === 0) {
          debug.warn(DebugCategories.PARAMETERS, 'No elements with parameters found')
          return
        }

        // Extract raw parameters
        const rawParams = extractRawParameters(validElements)
        debug.log(DebugCategories.PARAMETERS, 'Raw parameters extracted', {
          count: rawParams.length,
          elementCount: validElements.length,
          sample: rawParams[0]
            ? {
                id: rawParams[0].id,
                category: rawParams[0].metadata?.category,
                isParent: rawParams[0].metadata?.isParent
              }
            : null
        })

        // Process raw parameters into available parameters
        const processed: {
          parent: AvailableBimParameter[]
          child: AvailableBimParameter[]
        } = processParams(rawParams)
        debug.log(DebugCategories.PARAMETERS, 'Parameters processed', {
          rawCount: rawParams.length,
          processedCount: {
            parent: processed.parent.length,
            child: processed.child.length
          }
        })

        // Keep existing user parameters
        const parentUser = state.value.collections.available.parent.user
        const childUser = state.value.collections.available.child.user

        // Preserve existing values for BIM parameters
        const parentBimWithValues = processed.parent.map((param) => ({
          ...param,
          value:
            state.value.collections.available.parent.bim.find((p) => p.id === param.id)
              ?.value || param.value,
          visible: true
        }))

        const childBimWithValues = processed.child.map((param) => ({
          ...param,
          value:
            state.value.collections.available.child.bim.find((p) => p.id === param.id)
              ?.value || param.value,
          visible: true
        }))

        // Update state atomically
        state.value = {
          raw: rawParams,
          collections: {
            available: {
              parent: {
                bim: parentBimWithValues,
                user: parentUser // Keep existing user parameters
              },
              child: {
                bim: childBimWithValues,
                user: childUser // Keep existing user parameters
              }
            }
          },
          processing: {
            status: 'complete',
            error: null,
            lastAttempt: Date.now()
          },
          lastUpdated: Date.now(),
          initialized: true
        }

        // Log final state
        const finalCounts = {
          raw: rawParams.length,
          parent: {
            bim: parentBimWithValues.length,
            user: parentUser.length
          },
          child: {
            bim: childBimWithValues.length,
            user: childUser.length
          }
        }

        debug.completeState(
          DebugCategories.PARAMETERS,
          'Parameters processed',
          finalCounts
        )
      })
      .catch((err: unknown) => {
        debug.error(DebugCategories.PARAMETERS, 'Failed to process parameters:', err)
        state.value.processing.status = 'error'
        state.value.processing.error =
          err instanceof Error ? err : new Error(String(err))
        throw state.value.processing.error
      })
  }

  /**
   * Initialize parameter store
   */
  async function init(): Promise<void> {
    debug.startState(DebugCategories.PARAMETERS, 'Initializing parameter store')
    try {
      // Initialize state immediately
      state.value = {
        ...createInitialState(),
        initialized: true,
        processing: {
          status: 'complete',
          error: null,
          lastAttempt: Date.now()
        }
      }

      debug.completeState(DebugCategories.PARAMETERS, 'Parameter store initialized')

      // Load cache in background but await its completion
      const cached = await parameterCache.loadFromCache()
      if (cached?.length) {
        debug.log(DebugCategories.PARAMETERS, 'Processing cached parameters')
        const convertedElements = cached.map((param: RawParameter) => {
          const paramValue = convertToParameterValue(param.value)
          return {
            id: param.id,
            type: param.metadata?.category || 'Uncategorized',
            name: param.name,
            field: param.id,
            header: param.name,
            visible: true,
            removable: true,
            isChild: !param.metadata?.isParent,
            category: param.metadata?.category || 'Uncategorized',
            parameters: { [param.id]: paramValue },
            metadata: param.metadata,
            details: [],
            order: 0
          }
        })

        try {
          await processParameters(convertedElements)
          debug.log(DebugCategories.PARAMETERS, 'Cached parameters processed')
        } catch (err) {
          debug.error(
            DebugCategories.PARAMETERS,
            'Failed to process cached parameters:',
            err
          )
        }
      }
    } catch (err) {
      debug.error(DebugCategories.PARAMETERS, 'Failed to initialize store:', err)
      state.value.processing.status = 'error'
      state.value.processing.error = err instanceof Error ? err : new Error(String(err))
      throw state.value.processing.error
    }
  }

  /**
   * Reset store state
   */
  function reset(): void {
    state.value = createInitialState()
    debug.log(DebugCategories.PARAMETERS, 'Parameter store reset')
  }

  /**
   * Cache operations
   */
  async function loadFromCache(): Promise<void> {
    await parameterCache.loadFromCache()
  }

  async function saveToCache(): Promise<void> {
    await parameterCache.saveToCache(state.value.raw)
  }

  async function clearCache(): Promise<void> {
    await parameterCache.clearCache()
  }

  return {
    state: computed(() => state.value),
    rawParameters,
    parentAvailableBimParameters,
    parentAvailableUserParameters,
    childAvailableBimParameters,
    childAvailableUserParameters,
    isProcessing,
    hasError,
    lastUpdated,
    init,
    processParameters,
    loadFromCache,
    saveToCache,
    clearCache,
    reset
  }
}

// Global store instance
const store = createParameterStore()

/**
 * Parameter store composable
 */
export function useParameterStore() {
  return store
}
