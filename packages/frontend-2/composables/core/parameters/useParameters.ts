import { onMounted, watch, computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useParameterStore } from './store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter
} from './store/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { UserValueType } from '~/composables/core/types/parameters'
import { convertToParameterValue } from './parameter-processing'
import { createAvailableUserParameter } from '~/composables/core/types/parameters/parameter-states'

interface UseParametersOptions {
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
}

interface UseParametersReturn {
  // Parameter collections
  parentParameters: {
    raw: ComputedRef<RawParameter[]>
    available: {
      bim: ComputedRef<AvailableBimParameter[]>
      user: ComputedRef<AvailableUserParameter[]>
    }
  }
  childParameters: {
    raw: ComputedRef<RawParameter[]>
    available: {
      bim: ComputedRef<AvailableBimParameter[]>
      user: ComputedRef<AvailableUserParameter[]>
    }
  }

  // Parameter creation
  createUserParameter: (options: {
    name: string
    type: UserValueType
    group: string
    initialValue?: unknown
  }) => AvailableUserParameter

  // Status
  isProcessing: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  lastUpdated: ComputedRef<number>
}

export function useParameters(options: UseParametersOptions): UseParametersReturn {
  const parameterStore = useParameterStore()
  const tableStore = useTableStore()

  // Track last processed categories to prevent unnecessary reprocessing
  let lastProcessedParentCategories: string[] = []
  let lastProcessedChildCategories: string[] = []

  // Watch for category changes
  watch(
    [options.selectedParentCategories, options.selectedChildCategories],
    ([newParent, newChild], [oldParent, oldChild]) => {
      const parentCatsChanged =
        JSON.stringify(newParent) !== JSON.stringify(lastProcessedParentCategories)
      const childCatsChanged =
        JSON.stringify(newChild) !== JSON.stringify(lastProcessedChildCategories)

      if (parentCatsChanged || childCatsChanged) {
        debug.startState(DebugCategories.PARAMETERS, 'Processing category change')
        debug.log(DebugCategories.PARAMETERS, 'Categories changed', {
          oldParent,
          newParent,
          oldChild,
          newChild,
          currentState: {
            parent: {
              available: {
                bim: parameterStore.parentAvailableBimParameters.value?.length || 0,
                user: parameterStore.parentAvailableUserParameters.value?.length || 0
              }
            },
            child: {
              available: {
                bim: parameterStore.childAvailableBimParameters.value?.length || 0,
                user: parameterStore.childAvailableUserParameters.value?.length || 0
              }
            }
          }
        })

        try {
          // Update last processed categories
          lastProcessedParentCategories = [...newParent]
          lastProcessedChildCategories = [...newChild]

          debug.log(DebugCategories.PARAMETERS, 'Categories updated', {
            parent: newParent,
            child: newChild
          })

          debug.completeState(DebugCategories.PARAMETERS, 'Category change processed')
        } catch (err) {
          debug.error(
            DebugCategories.PARAMETERS,
            'Error processing category change:',
            err
          )
          debug.error(DebugCategories.PARAMETERS, 'Category change error:', {
            error: err,
            state: {
              hasTable: !!tableStore.computed.currentTable.value
            }
          })
        }
      }
    },
    { immediate: true }
  )

  // Initialize on mount
  onMounted(async () => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Initializing parameters composable')

      // Set initial categories
      lastProcessedParentCategories = [...options.selectedParentCategories.value]
      lastProcessedChildCategories = [...options.selectedChildCategories.value]

      // Wait for stores to be ready
      debug.log(DebugCategories.PARAMETERS, 'Waiting for stores')
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Store initialization timeout'))
        }, 10000)

        if (
          !parameterStore.isProcessing.value &&
          parameterStore.state.value.initialized &&
          tableStore.computed.currentTable.value
        ) {
          clearTimeout(timeout)
          resolve()
          return
        }

        const unwatch = watch(
          [
            () => parameterStore.isProcessing.value,
            () => parameterStore.state.value.initialized,
            () => tableStore.computed.currentTable.value
          ],
          ([isProcessing, initialized, table]) => {
            if (!isProcessing && initialized && table) {
              clearTimeout(timeout)
              unwatch()
              resolve()
            }
          },
          { immediate: true }
        )
      })

      // Now that stores are ready, verify parameters
      const paramCounts = {
        raw: parameterStore.rawParameters.value?.length || 0,
        available: {
          parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
          childBim: parameterStore.childAvailableBimParameters.value?.length || 0
        }
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameter availability check', paramCounts)

      // Log if no parameters found but continue with defaults
      if (paramCounts.raw === 0) {
        debug.warn(DebugCategories.PARAMETERS, 'No parameters found in store')
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameters initialized', {
        raw: paramCounts.raw,
        parent: {
          available: {
            bim: parameterStore.parentAvailableBimParameters.value?.length || 0,
            user: parameterStore.parentAvailableUserParameters.value?.length || 0
          }
        },
        child: {
          available: {
            bim: parameterStore.childAvailableBimParameters.value?.length || 0,
            user: parameterStore.childAvailableUserParameters.value?.length || 0
          }
        }
      })

      debug.completeState(
        DebugCategories.PARAMETERS,
        'Parameters composable initialized'
      )
    } catch (err) {
      debug.error(DebugCategories.PARAMETERS, 'Failed to initialize parameters:', err)
      debug.error(DebugCategories.PARAMETERS, 'Initialization error:', {
        error: err,
        state: {
          hasTable: !!tableStore.computed.currentTable.value,
          hasParameters: parameterStore.rawParameters.value?.length || 0
        }
      })
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  return {
    // Parameter collections
    parentParameters: {
      raw: parameterStore.rawParameters,
      available: {
        bim: parameterStore.parentAvailableBimParameters,
        user: parameterStore.parentAvailableUserParameters
      }
    },
    childParameters: {
      raw: parameterStore.rawParameters,
      available: {
        bim: parameterStore.childAvailableBimParameters,
        user: parameterStore.childAvailableUserParameters
      }
    },

    // Parameter creation
    createUserParameter: ({ name, type, group, initialValue }) => {
      debug.log(DebugCategories.PARAMETERS, 'Creating user parameter', {
        name,
        type,
        group,
        initialValue
      })

      const parameterValue =
        initialValue !== undefined ? convertToParameterValue(initialValue) : null

      // Create parameter with proper metadata
      const id = `${name}-${Date.now()}`
      const availableParam = createAvailableUserParameter(
        id,
        name,
        type,
        parameterValue,
        group,
        undefined, // equation
        {
          displayName: name,
          originalGroup: group,
          groupId: `user_${group}`
        }
      )

      debug.log(DebugCategories.PARAMETERS, 'User parameter created', {
        id: availableParam.id,
        name: availableParam.name,
        type: availableParam.type
      })

      return availableParam
    },

    // Status
    isProcessing: parameterStore.isProcessing,
    hasError: computed(
      () => parameterStore.hasError.value || tableStore.hasError.value
    ),
    lastUpdated: computed(() =>
      Math.max(parameterStore.lastUpdated.value, tableStore.lastUpdated.value)
    )
  }
}
