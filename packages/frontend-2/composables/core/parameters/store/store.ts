import { ref, computed } from 'vue'
import { debug } from '~/composables/core/utils/debug'
import { parentCategories } from '~/composables/core/config/categories'
import { ParameterDebugCategories } from '~/composables/core/utils/debug-categories'
import type { ElementData, ParameterValue } from '~/composables/core/types'
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
  createSelectedParameters,
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
      },
      selected: []
    },
    child: {
      raw: [],
      available: {
        bim: [],
        user: []
      },
      selected: []
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
  const parentSelectedParameters = computed(() => state.value.parent.selected)
  const childSelectedParameters = computed(() => state.value.child.selected)

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

      // Create selected parameters from both BIM and user parameters
      const parentSelected = createSelectedParameters(
        [...parentBimWithValues, ...parentUser],
        state.value.parent.selected
      )

      const childSelected = createSelectedParameters(
        [...childBimWithValues, ...childUser],
        state.value.child.selected
      )

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
          },
          selected: parentSelected
        },
        child: {
          raw: rawParams.filter((p) => {
            const category = p.metadata?.category || 'Uncategorized'
            return !(p.metadata?.isParent || parentCategories.includes(category))
          }),
          available: {
            bim: childBimWithValues,
            user: childUser // Keep existing user parameters
          },
          selected: childSelected
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
          user: parentUser.length,
          selected: parentSelected.length
        },
        child: {
          raw: state.value.child.raw.length,
          bim: childBimWithValues.length,
          user: childUser.length,
          selected: childSelected.length
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
   * Update parameter visibility
   */
  function updateParameterVisibility(
    parameterId: string,
    visible: boolean,
    isParent: boolean
  ): void {
    const newState = { ...state.value }

    if (isParent) {
      newState.parent = {
        ...newState.parent,
        selected: newState.parent.selected.map((param) =>
          param.id === parameterId ? { ...param, visible } : param
        )
      }
    } else {
      newState.child = {
        ...newState.child,
        selected: newState.child.selected.map((param) =>
          param.id === parameterId ? { ...param, visible } : param
        )
      }
    }

    newState.lastUpdated = Date.now()
    state.value = newState

    debug.log(ParameterDebugCategories.STATE, 'Parameter visibility updated', {
      parameterId,
      visible,
      isParent,
      selectedCount: {
        parent: newState.parent.selected.filter((p) => p.visible).length,
        child: newState.child.selected.filter((p) => p.visible).length
      }
    })
  }

  /**
   * Initialize parameter store
   */
  async function init(): Promise<void> {
    try {
      debug.startState(ParameterDebugCategories.STATE, 'Initializing parameter store')
      state.value.processing.status = 'processing'

      // Reset state to ensure clean initialization
      state.value = createInitialState()

      // Wait for any cached data and convert to ElementData format
      const cached: RawParameter[] | null = await parameterCache.loadFromCache()
      if (cached?.length) {
        debug.log(ParameterDebugCategories.STATE, 'Found cached parameters', {
          count: cached.length,
          sample: cached[0]
            ? {
                id: cached[0].id,
                category: cached[0].metadata?.category,
                isParent: cached[0].metadata?.isParent
              }
            : null
        })

        // Convert cached parameters to ElementData format with proper value conversion
        let convertedElements: ElementData[] = []
        try {
          convertedElements = cached.map((param: RawParameter) => {
            const paramValue = convertToParameterValue(param.value)
            const parameters: Record<string, ParameterValue> = {
              [param.id]: paramValue
            }

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
              parameters,
              metadata: param.metadata,
              details: [],
              order: 0
            }
          })

          // Process converted elements
          await processParameters(convertedElements)
        } catch (conversionError) {
          debug.error(
            ParameterDebugCategories.STATE,
            'Failed to convert cached parameters:',
            conversionError
          )
          throw new Error('Failed to convert cached parameters')
        }
      }

      // Verify store state
      const counts = {
        parent: {
          raw: state.value.parent.raw.length,
          bim: state.value.parent.available.bim.length,
          user: state.value.parent.available.user.length,
          selected: state.value.parent.selected.length
        },
        child: {
          raw: state.value.child.raw.length,
          bim: state.value.child.available.bim.length,
          user: state.value.child.available.user.length,
          selected: state.value.child.selected.length
        }
      }

      state.value.initialized = true
      state.value.processing.status = 'complete'
      debug.completeState(
        ParameterDebugCategories.STATE,
        'Parameter store initialized',
        counts
      )
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

    // Selected parameters
    parentSelectedParameters,
    childSelectedParameters,

    // Status
    isProcessing,
    hasError,
    lastUpdated,

    // Core operations
    init,
    processParameters,
    updateParameterVisibility,

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
