import { onMounted, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useParameterStore } from './store'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ColumnDefinition
} from './store/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { UserValueType } from '~/composables/core/types/parameters'
import { convertToParameterValue } from './parameter-processing'

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
    selected: ComputedRef<SelectedParameter[]>
    columns: ComputedRef<ColumnDefinition[]>
  }
  childParameters: {
    raw: ComputedRef<RawParameter[]>
    available: {
      bim: ComputedRef<AvailableBimParameter[]>
      user: ComputedRef<AvailableUserParameter[]>
    }
    selected: ComputedRef<SelectedParameter[]>
    columns: ComputedRef<ColumnDefinition[]>
  }

  // Parameter management
  addUserParameter: (options: {
    isParent: boolean
    name: string
    type: UserValueType
    group: string
    initialValue?: unknown
  }) => void
  removeParameter: (id: string, isParent: boolean) => void
  updateParameterVisibility: (id: string, visible: boolean, isParent: boolean) => void
  updateParameterOrder: (id: string, newOrder: number, isParent: boolean) => void

  // Status
  isProcessing: ComputedRef<boolean>
  hasError: ComputedRef<boolean>
  lastUpdated: ComputedRef<number>
}

export function useParameters(options: UseParametersOptions): UseParametersReturn {
  const store = useParameterStore()

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
              raw: store.parentRawParameters.value?.length || 0,
              available: {
                bim: store.parentAvailableBimParameters.value?.length || 0,
                user: store.parentAvailableUserParameters.value?.length || 0
              },
              selected: store.parentSelectedParameters.value?.length || 0
            },
            child: {
              raw: store.childRawParameters.value?.length || 0,
              available: {
                bim: store.childAvailableBimParameters.value?.length || 0,
                user: store.childAvailableUserParameters.value?.length || 0
              },
              selected: store.childSelectedParameters.value?.length || 0
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
          store.setError(err instanceof Error ? err : new Error(String(err)))
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

      // Wait for store to be ready
      if (store.isProcessing.value) {
        debug.log(DebugCategories.PARAMETERS, 'Waiting for parameter store')
        await new Promise<void>((resolve) => {
          const unwatch = watch(
            () => store.isProcessing.value,
            (isProcessing) => {
              if (!isProcessing) {
                unwatch()
                resolve()
              }
            },
            { immediate: true }
          )
        })
      }

      // Verify parameters exist
      const hasParameters =
        (store.parentRawParameters.value?.length ?? 0) > 0 ||
        (store.childRawParameters.value?.length ?? 0) > 0

      if (!hasParameters) {
        debug.warn(DebugCategories.PARAMETERS, 'No parameters found in store')
        return
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameters initialized', {
        parent: {
          raw: store.parentRawParameters.value?.length || 0,
          available: {
            bim: store.parentAvailableBimParameters.value?.length || 0,
            user: store.parentAvailableUserParameters.value?.length || 0
          },
          selected: store.parentSelectedParameters.value?.length || 0,
          columns: store.parentColumnDefinitions.value?.length || 0
        },
        child: {
          raw: store.childRawParameters.value?.length || 0,
          available: {
            bim: store.childAvailableBimParameters.value?.length || 0,
            user: store.childAvailableUserParameters.value?.length || 0
          },
          selected: store.childSelectedParameters.value?.length || 0,
          columns: store.childColumnDefinitions.value?.length || 0
        }
      })

      debug.completeState(
        DebugCategories.PARAMETERS,
        'Parameters composable initialized'
      )
    } catch (err) {
      debug.error(DebugCategories.PARAMETERS, 'Failed to initialize parameters:', err)
      store.setError(err instanceof Error ? err : new Error(String(err)))
    }
  })

  return {
    // Parameter collections
    parentParameters: {
      raw: store.parentRawParameters,
      available: {
        bim: store.parentAvailableBimParameters,
        user: store.parentAvailableUserParameters
      },
      selected: store.parentSelectedParameters,
      columns: store.parentColumnDefinitions
    },
    childParameters: {
      raw: store.childRawParameters,
      available: {
        bim: store.childAvailableBimParameters,
        user: store.childAvailableUserParameters
      },
      selected: store.childSelectedParameters,
      columns: store.childColumnDefinitions
    },

    // Parameter management
    addUserParameter: ({ isParent, name, type, group, initialValue }) => {
      debug.log(DebugCategories.PARAMETERS, 'Adding user parameter', {
        isParent,
        name,
        type,
        group,
        initialValue
      })

      const parameterValue =
        initialValue !== undefined ? convertToParameterValue(initialValue) : null
      store.addUserParameter(isParent, name, type, group, parameterValue)

      debug.log(DebugCategories.PARAMETERS, 'User parameter added', {
        state: {
          available: {
            user: isParent
              ? store.parentAvailableUserParameters.value?.length || 0
              : store.childAvailableUserParameters.value?.length || 0
          }
        }
      })
    },
    removeParameter: (id, isParent) => {
      debug.log(DebugCategories.PARAMETERS, 'Removing parameter', {
        id,
        isParent,
        state: {
          available: {
            bim: isParent
              ? store.parentAvailableBimParameters.value?.length || 0
              : store.childAvailableBimParameters.value?.length || 0,
            user: isParent
              ? store.parentAvailableUserParameters.value?.length || 0
              : store.childAvailableUserParameters.value?.length || 0
          }
        }
      })

      store.removeParameter(isParent, id)

      debug.log(DebugCategories.PARAMETERS, 'Parameter removed', {
        state: {
          available: {
            bim: isParent
              ? store.parentAvailableBimParameters.value?.length || 0
              : store.childAvailableBimParameters.value?.length || 0,
            user: isParent
              ? store.parentAvailableUserParameters.value?.length || 0
              : store.childAvailableUserParameters.value?.length || 0
          }
        }
      })
    },
    updateParameterVisibility: (id, visible, isParent) => {
      store.updateParameterVisibility(id, visible, isParent)
    },
    updateParameterOrder: (id, newOrder, isParent) => {
      store.updateParameterOrder(id, newOrder, isParent)
    },

    // Status
    isProcessing: store.isProcessing,
    hasError: store.hasError,
    lastUpdated: store.lastUpdated
  }
}
