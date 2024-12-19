import { onMounted, watch } from 'vue'
import type { ComputedRef } from 'vue'
import { useParameterStore } from '../store/'
import type {
  RawParameter,
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter,
  ColumnDefinition
} from '@/composables/core/parameters/store/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { UserValueType } from '~/composables/core/types/parameters'
import { convertToParameterValue } from '~/composables/core/parameters/utils/parameter-conversion'

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

  // Watch for category changes
  watch(
    [options.selectedParentCategories, options.selectedChildCategories],
    ([newParent, newChild], [oldParent, oldChild]) => {
      if (
        JSON.stringify(newParent) !== JSON.stringify(oldParent) ||
        JSON.stringify(newChild) !== JSON.stringify(oldChild)
      ) {
        debug.log(DebugCategories.PARAMETERS, 'Categories changed', {
          oldParent,
          newParent,
          oldChild,
          newChild
        })
      }
    },
    { immediate: true }
  )

  // Initialize on mount
  onMounted(() => {
    debug.log(DebugCategories.PARAMETERS, 'Parameters composable mounted')
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
      const parameterValue =
        initialValue !== undefined ? convertToParameterValue(initialValue) : null
      store.addUserParameter(isParent, name, type, group, parameterValue)
    },
    removeParameter: (id, isParent) => {
      store.removeParameter(isParent, id)
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
