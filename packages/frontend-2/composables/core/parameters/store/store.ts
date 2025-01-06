import { ref, computed } from 'vue'
import { debug } from '~/composables/core/utils/debug'
import { parentCategories } from '~/composables/core/config/categories'
import { ParameterDebugCategories } from '~/composables/core/utils/debug-categories'
import type { ElementData } from '~/composables/core/types'
import type {
  ParameterStore,
  ParameterStoreState,
  AvailableBimParameter,
  RawParameter
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
    parent: {
      raw: [],
      available: {
        bim: [],
        user: []
      }
    },
    child: {
      raw: [],
      available: {
        bim: [],
        user: []
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
  const parentRawParameters = computed(() => state.value.parent.raw)
  const childRawParameters = computed(() => state.value.child.raw)
  const parentAvailableBimParameters = computed(() => state.value.parent.available.bim)
  const parentAvailableUserParameters = computed(
    () => state.value.parent.available.user
  )
  const childAvailableBimParameters = computed(() => state.value.child.available.bim)
  const childAvailableUserParameters = computed(() => state.value.child.available.user)

  /**
   * Process parameters from elements
   */
  async function processParameters(elements: ElementData[]): Promise<void> {
    try {
      debug.startState(ParameterDebugCategories.STATE, 'Processing parameters')
      state.value.processing.status = 'processing'
      state.value.processing.lastAttempt = Date.now()

      // Verify elements have parameters
      const validElements = elements.filter(
        (el) => el.parameters && Object.keys(el.parameters).length > 0
      )

      debug.log(ParameterDebugCategories.STATE, 'Elements with parameters', {
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
        debug.warn(ParameterDebugCategories.STATE, 'No elements with parameters found')
        return
      }

      // Extract raw parameters
      const rawParams = extractRawParameters(validElements)
      debug.log(ParameterDebugCategories.STATE, 'Raw parameters extracted', {
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
      const available = await processParams(rawParams)
      debug.log(ParameterDebugCategories.STATE, 'Parameters processed', {
        rawCount: rawParams.length,
        processedCount: available.length,
        sample: available[0]
          ? {
              id: available[0].id,
              kind: available[0].kind,
              category: available[0].metadata?.category
            }
          : null
      })

      // Split into parent/child (all world tree parameters are BIM)
      const parentBim: AvailableBimParameter[] = []
      const childBim: AvailableBimParameter[] = []

      // Keep existing user parameters
      const parentUser = state.value.parent.available.user
      const childUser = state.value.child.available.user

      // Categorize BIM parameters by parent/child
      available.forEach((param) => {
        const category = param.metadata?.category || 'Uncategorized'
        const isParent = param.metadata?.isParent || parentCategories.includes(category)

        // Set required properties
        if (!param.sourceGroup) param.sourceGroup = category
        if (!param.currentGroup) param.currentGroup = param.sourceGroup

        // Add to appropriate array
        if (isParent) parentBim.push(param)
        else childBim.push(param)
      })

      // Log categorization results
      debug.log(ParameterDebugCategories.STATE, 'Parameters categorized', {
        total: available.length,
        parent: {
          bim: parentBim.length,
          user: parentUser.length,
          categories: Array.from(new Set(parentBim.map((p) => p.metadata?.category)))
        },
        child: {
          bim: childBim.length,
          user: childUser.length,
          categories: Array.from(new Set(childBim.map((p) => p.metadata?.category)))
        }
      })

      // Preserve existing values for BIM parameters
      const parentBimWithValues = parentBim.map((param) => ({
        ...param,
        value:
          state.value.parent.available.bim.find((p) => p.id === param.id)?.value ||
          param.value,
        visible: true
      }))

      const childBimWithValues = childBim.map((param) => ({
        ...param,
        value:
          state.value.child.available.bim.find((p) => p.id === param.id)?.value ||
          param.value,
        visible: true
      }))

      // Update state atomically
      state.value = {
        parent: {
          raw: rawParams.filter((p) => {
            const category = p.metadata?.category || 'Uncategorized'
            return p.metadata?.isParent || parentCategories.includes(category)
          }),
          available: {
            bim: parentBimWithValues,
            user: parentUser // Keep existing user parameters
          }
        },
        child: {
          raw: rawParams.filter((p) => {
            const category = p.metadata?.category || 'Uncategorized'
            return !(p.metadata?.isParent || parentCategories.includes(category))
          }),
          available: {
            bim: childBimWithValues,
            user: childUser // Keep existing user parameters
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
        parent: {
          raw: state.value.parent.raw.length,
          bim: parentBimWithValues.length,
          user: parentUser.length
        },
        child: {
          raw: state.value.child.raw.length,
          bim: childBimWithValues.length,
          user: childUser.length
        }
      }

      debug.completeState(
        ParameterDebugCategories.STATE,
        'Parameters processed',
        finalCounts
      )
    } catch (err) {
      debug.error(ParameterDebugCategories.STATE, 'Failed to process parameters:', err)
      state.value.processing.status = 'error'
      state.value.processing.error = err instanceof Error ? err : new Error(String(err))
      throw state.value.processing.error
    }
  }

  /**
   * Initialize parameter store
   */
  async function init(): Promise<void> {
    debug.startState(ParameterDebugCategories.STATE, 'Initializing parameter store')
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

      debug.completeState(ParameterDebugCategories.STATE, 'Parameter store initialized')

      // Load cache in background but await its completion
      await parameterCache
        .loadFromCache()
        .then((cached: RawParameter[] | null) => {
          if (cached?.length) {
            debug.log(ParameterDebugCategories.STATE, 'Processing cached parameters')
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
            processParameters(convertedElements).catch((err) => {
              debug.error(
                ParameterDebugCategories.STATE,
                'Failed to process cached parameters:',
                err
              )
            })
          }
        })
        .catch((err) => {
          debug.error(ParameterDebugCategories.STATE, 'Failed to load cache:', err)
        })
    } catch (err) {
      debug.error(ParameterDebugCategories.STATE, 'Failed to initialize store:', err)
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
    debug.log(ParameterDebugCategories.STATE, 'Parameter store reset')
  }

  /**
   * Cache operations
   */
  async function loadFromCache(): Promise<void> {
    await parameterCache.loadFromCache()
  }

  async function saveToCache(): Promise<void> {
    const params = [...state.value.parent.raw, ...state.value.child.raw]
    await parameterCache.saveToCache(params)
  }

  async function clearCache(): Promise<void> {
    await parameterCache.clearCache()
  }

  return {
    // State
    state: computed(() => state.value),

    // Raw parameters
    parentRawParameters,
    childRawParameters,

    // Available parameters
    parentAvailableBimParameters,
    parentAvailableUserParameters,
    childAvailableBimParameters,
    childAvailableUserParameters,

    // Status
    isProcessing,
    hasError,
    lastUpdated,

    // Core operations
    init,
    processParameters,

    // Cache operations
    loadFromCache,
    saveToCache,
    clearCache,

    // Reset
    reset
  } as const
}

// Global store instance
const store = createParameterStore()

/**
 * Parameter store composable
 */
export function useParameterStore() {
  return store
}
