import { ref, computed } from 'vue'
import { debug } from '~/composables/core/utils/debug'
import { ParameterDebugCategories } from '~/composables/core/utils/debug-categories'
import type { ElementData } from '~/composables/core/types'
import type {
  ParameterStore,
  ParameterStoreState,
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter
} from './types'
import { parameterCache } from './cache'
import {
  processRawParameters as processParams,
  extractRawParameters,
  createSelectedParameters
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
      state.value.processing.status = 'processing'
      state.value.processing.lastAttempt = Date.now()

      // Verify elements have parameters
      const validElements = elements.filter(
        (el) => el.parameters && Object.keys(el.parameters).length > 0
      )
      if (validElements.length === 0) {
        debug.warn(
          ParameterDebugCategories.STATE,
          'No elements with parameters found',
          {
            totalElements: elements.length
          }
        )
        return
      }

      // Extract and process parameters
      const rawParams = extractRawParameters(validElements)
      debug.log(ParameterDebugCategories.STATE, 'Raw parameters extracted', {
        count: rawParams.length,
        elementCount: validElements.length,
        sampleElement: validElements[0].id,
        sampleParameters: Object.keys(validElements[0].parameters || {}).length
      })

      const processed = await processParams(rawParams)
      debug.log(ParameterDebugCategories.STATE, 'Parameters processed', {
        rawCount: rawParams.length,
        processedCount: processed.length,
        elementCount: validElements.length,
        sampleParameter: processed[0]
          ? {
              id: processed[0].id,
              value: processed[0].value,
              kind: processed[0].kind
            }
          : null
      })

      // Split into parent/child and categorize
      const parentBim: AvailableBimParameter[] = []
      const parentUser: AvailableUserParameter[] = []
      const childBim: AvailableBimParameter[] = []
      const childUser: AvailableUserParameter[] = []

      processed.forEach((param) => {
        const isParent = param.metadata?.isParent
        const isBim = param.kind === 'bim'

        if (isParent) {
          isBim
            ? parentBim.push(param as AvailableBimParameter)
            : parentUser.push(param as AvailableUserParameter)
        } else {
          isBim
            ? childBim.push(param as AvailableBimParameter)
            : childUser.push(param as AvailableUserParameter)
        }
      })

      // Preserve existing parameter values
      const preserveBimValues = (
        params: AvailableBimParameter[],
        existingParams: AvailableBimParameter[]
      ): AvailableBimParameter[] => {
        return params.map((param) => {
          const existing = existingParams.find((e) => e.id === param.id)
          if (existing) {
            return {
              ...param,
              value: existing.value,
              visible: existing.visible || false
            }
          }
          return {
            ...param,
            visible: true // Default visibility for new parameters
          }
        })
      }

      const preserveUserValues = (
        params: AvailableUserParameter[],
        existingParams: AvailableUserParameter[]
      ): AvailableUserParameter[] => {
        return params.map((param) => {
          const existing = existingParams.find((e) => e.id === param.id)
          if (existing) {
            return {
              ...param,
              value: existing.value,
              visible: existing.visible || false
            }
          }
          return {
            ...param,
            visible: true // Default visibility for new parameters
          }
        })
      }

      // Preserve values in available parameters
      const parentBimWithValues = preserveBimValues(
        parentBim,
        state.value.parent.available.bim
      )
      const parentUserWithValues = preserveUserValues(
        parentUser,
        state.value.parent.available.user
      )
      const childBimWithValues = preserveBimValues(
        childBim,
        state.value.child.available.bim
      )
      const childUserWithValues = preserveUserValues(
        childUser,
        state.value.child.available.user
      )

      // Create selected parameters from available ones with preserved values
      const parentSelected = createSelectedParameters(
        [...parentBimWithValues, ...parentUserWithValues],
        state.value.parent.selected
      )
      const childSelected = createSelectedParameters(
        [...childBimWithValues, ...childUserWithValues],
        state.value.child.selected
      )

      // Update state with preserved values
      state.value.parent = {
        raw: rawParams.filter((p: RawParameter) => p.metadata?.isParent),
        available: {
          bim: parentBimWithValues,
          user: parentUserWithValues
        },
        selected: parentSelected
      }

      state.value.child = {
        raw: rawParams.filter((p: RawParameter) => !p.metadata?.isParent),
        available: {
          bim: childBimWithValues,
          user: childUserWithValues
        },
        selected: childSelected
      }

      debug.log(ParameterDebugCategories.STATE, 'Parameter values preserved', {
        parent: {
          bim: parentBimWithValues.length,
          user: parentUserWithValues.length,
          selected: parentSelected.length
        },
        child: {
          bim: childBimWithValues.length,
          user: childUserWithValues.length,
          selected: childSelected.length
        }
      })

      debug.log(ParameterDebugCategories.STATE, 'Parameters updated', {
        parent: {
          raw: state.value.parent.raw.length,
          bim: parentBim.length,
          user: parentUser.length,
          selected: parentSelected.length
        },
        child: {
          raw: state.value.child.raw.length,
          bim: childBim.length,
          user: childUser.length,
          selected: childSelected.length
        }
      })

      state.value.processing.status = 'complete'
      state.value.processing.error = null
      state.value.lastUpdated = Date.now()
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
    const target = isParent ? state.value.parent : state.value.child
    const param = [...target.available.bim, ...target.available.user].find(
      (p) => p.id === parameterId
    )

    if (param) {
      param.visible = visible
      state.value.lastUpdated = Date.now()
    }
  }

  /**
   * Core operations
   */
  async function init(): Promise<void> {
    try {
      debug.log(ParameterDebugCategories.STATE, 'Initializing parameter store')
      state.value.processing.status = 'processing'

      // Initialize with empty collections
      state.value.parent = {
        raw: [],
        available: {
          bim: [],
          user: []
        },
        selected: []
      }
      state.value.child = {
        raw: [],
        available: {
          bim: [],
          user: []
        },
        selected: []
      }

      // Wait for any cached data
      const cached = await parameterCache.loadFromCache()
      if (cached?.length) {
        debug.log(ParameterDebugCategories.STATE, 'Found cached parameters', {
          count: cached.length
        })
      }

      state.value.initialized = true
      state.value.processing.status = 'complete'
      debug.log(ParameterDebugCategories.STATE, 'Parameter store initialized')
    } catch (err) {
      debug.error(ParameterDebugCategories.STATE, 'Failed to initialize store:', err)
      state.value.processing.status = 'error'
      state.value.processing.error = err instanceof Error ? err : new Error(String(err))
      throw state.value.processing.error
    }
  }

  function reset(): void {
    state.value = createInitialState()
    debug.log(ParameterDebugCategories.STATE, 'Parameter store reset')
  }

  /**
   * Cache operations - only store raw parameters, let initialization flow handle processing
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
