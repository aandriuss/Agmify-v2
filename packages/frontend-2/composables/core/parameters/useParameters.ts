import { onMounted, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useParameterStore } from './store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
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
  }
  childParameters: {
    raw: ComputedRef<RawParameter[]>
    available: {
      bim: ComputedRef<AvailableBimParameter[]>
      user: ComputedRef<AvailableUserParameter[]>
    }
    selected: ComputedRef<SelectedParameter[]>
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
              raw: parameterStore.parentRawParameters.value?.length || 0,
              available: {
                bim: parameterStore.parentAvailableBimParameters.value?.length || 0,
                user: parameterStore.parentAvailableUserParameters.value?.length || 0
              },
              selected:
                tableStore.computed.currentTable.value?.selectedParameters?.parent
                  ?.length || 0
            },
            child: {
              raw: parameterStore.childRawParameters.value?.length || 0,
              available: {
                bim: parameterStore.childAvailableBimParameters.value?.length || 0,
                user: parameterStore.childAvailableUserParameters.value?.length || 0
              },
              selected:
                tableStore.computed.currentTable.value?.selectedParameters?.child
                  ?.length || 0
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
              hasTable: !!tableStore.computed.currentTable.value,
              hasParameters: parameterStore.parentRawParameters.value?.length || 0
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
        parentRaw: parameterStore.parentRawParameters.value?.length || 0,
        childRaw: parameterStore.childRawParameters.value?.length || 0,
        parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
        childBim: parameterStore.childAvailableBimParameters.value?.length || 0
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameter availability check', paramCounts)

      // Log if no parameters found but continue with defaults
      if (paramCounts.parentRaw === 0 && paramCounts.childRaw === 0) {
        debug.warn(DebugCategories.PARAMETERS, 'No parameters found in store')
      }

      debug.log(DebugCategories.PARAMETERS, 'Parameters initialized', {
        parent: {
          raw: parameterStore.parentRawParameters.value?.length || 0,
          available: {
            bim: parameterStore.parentAvailableBimParameters.value?.length || 0,
            user: parameterStore.parentAvailableUserParameters.value?.length || 0
          },
          selected:
            tableStore.computed.currentTable.value?.selectedParameters?.parent
              ?.length || 0
        },
        child: {
          raw: parameterStore.childRawParameters.value?.length || 0,
          available: {
            bim: parameterStore.childAvailableBimParameters.value?.length || 0,
            user: parameterStore.childAvailableUserParameters.value?.length || 0
          },
          selected:
            tableStore.computed.currentTable.value?.selectedParameters?.child?.length ||
            0
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
          hasParameters: parameterStore.parentRawParameters.value?.length || 0
        }
      })
      throw err instanceof Error ? err : new Error(String(err))
    }
  })

  return {
    // Parameter collections
    parentParameters: {
      raw: parameterStore.parentRawParameters,
      available: {
        bim: parameterStore.parentAvailableBimParameters,
        user: parameterStore.parentAvailableUserParameters
      },
      selected: computed(
        () => tableStore.computed.currentTable.value?.selectedParameters?.parent || []
      )
    },
    childParameters: {
      raw: parameterStore.childRawParameters,
      available: {
        bim: parameterStore.childAvailableBimParameters,
        user: parameterStore.childAvailableUserParameters
      },
      selected: computed(
        () => tableStore.computed.currentTable.value?.selectedParameters?.child || []
      )
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
      const currentParams = tableStore.computed.currentTable.value?.selectedParameters
      const parentParams = currentParams?.parent || []
      const childParams = currentParams?.child || []

      tableStore.updateTable({
        selectedParameters: {
          parent: isParent
            ? [
                ...parentParams,
                {
                  id: `${name}-${Date.now()}`,
                  name,
                  type,
                  group,
                  value: parameterValue,
                  kind: 'user' as const,
                  visible: true,
                  order: parentParams.length + 1,
                  field: name,
                  header: name,
                  removable: true
                }
              ]
            : parentParams,
          child: !isParent
            ? [
                ...childParams,
                {
                  id: `${name}-${Date.now()}`,
                  name,
                  type,
                  group,
                  value: parameterValue,
                  kind: 'user' as const,
                  visible: true,
                  order: childParams.length + 1,
                  field: name,
                  header: name,
                  removable: true
                }
              ]
            : childParams
        }
      })

      debug.log(DebugCategories.PARAMETERS, 'User parameter added', {
        state: {
          selected: {
            parent:
              tableStore.computed.currentTable.value?.selectedParameters?.parent
                ?.length || 0,
            child:
              tableStore.computed.currentTable.value?.selectedParameters?.child
                ?.length || 0
          }
        }
      })
    },
    removeParameter: (id, isParent) => {
      debug.log(DebugCategories.PARAMETERS, 'Removing parameter', {
        id,
        isParent,
        state: {
          selected: {
            parent:
              tableStore.computed.currentTable.value?.selectedParameters?.parent
                ?.length || 0,
            child:
              tableStore.computed.currentTable.value?.selectedParameters?.child
                ?.length || 0
          }
        }
      })

      tableStore.updateTable({
        selectedParameters: {
          parent: isParent
            ? (
                tableStore.computed.currentTable.value?.selectedParameters?.parent || []
              ).filter((p) => p.id !== id)
            : tableStore.computed.currentTable.value?.selectedParameters?.parent || [],
          child: !isParent
            ? (
                tableStore.computed.currentTable.value?.selectedParameters?.child || []
              ).filter((p) => p.id !== id)
            : tableStore.computed.currentTable.value?.selectedParameters?.child || []
        }
      })

      debug.log(DebugCategories.PARAMETERS, 'Parameter removed', {
        state: {
          selected: {
            parent:
              tableStore.computed.currentTable.value?.selectedParameters?.parent
                ?.length || 0,
            child:
              tableStore.computed.currentTable.value?.selectedParameters?.child
                ?.length || 0
          }
        }
      })
    },
    updateParameterVisibility: (id, visible, isParent) => {
      const params = tableStore.computed.currentTable.value?.selectedParameters
      if (!params) return

      tableStore.updateTable({
        selectedParameters: {
          parent: isParent
            ? params.parent.map((p) => (p.id === id ? { ...p, visible } : p))
            : params.parent,
          child: !isParent
            ? params.child.map((p) => (p.id === id ? { ...p, visible } : p))
            : params.child
        }
      })
    },
    updateParameterOrder: (id, newOrder, isParent) => {
      const params = tableStore.computed.currentTable.value?.selectedParameters
      if (!params) return

      tableStore.updateTable({
        selectedParameters: {
          parent: isParent
            ? params.parent.map((p) => (p.id === id ? { ...p, order: newOrder } : p))
            : params.parent,
          child: !isParent
            ? params.child.map((p) => (p.id === id ? { ...p, order: newOrder } : p))
            : params.child
        }
      })
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
