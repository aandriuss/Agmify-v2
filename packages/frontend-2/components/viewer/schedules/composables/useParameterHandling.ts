import { debug, DebugCategories } from '../utils/debug'
import type { ComputedRef } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData } from '../types'

interface ParameterHandlingOptions {
  state: {
    scheduleData: ElementData[]
    customParameters: CustomParameter[]
    parameterColumns: ColumnDef[]
    mergedParentParameters: CustomParameter[]
    mergedChildParameters: CustomParameter[]
  }
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  updateParameterColumns: (columns: ColumnDef[]) => void
  updateMergedParameters: (
    parentParams: CustomParameter[],
    childParams: CustomParameter[]
  ) => void
  handleError: (error: Error) => void
}

export function useParameterHandling(options: ParameterHandlingOptions) {
  const {
    state,
    updateParameterColumns,
    updateMergedParameters,
    handleError,
    selectedParentCategories,
    selectedChildCategories
  } = options

  function updateParameterVisibility(field: string, visible: boolean) {
    debug.log(DebugCategories.PARAMETERS, 'Parameter visibility update requested', {
      field,
      visible,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Update visibility in parameter columns
      const updatedColumns = state.parameterColumns.map((col) => {
        if ('field' in col && col.field === field) {
          return { ...col, visible }
        }
        return col
      })

      // Update state
      updateParameterColumns(updatedColumns)

      // Update merged parameters
      const updatedParentParams = state.mergedParentParameters.map((param) => {
        if (param.field === field) {
          return { ...param, visible }
        }
        return param
      })

      const updatedChildParams = state.mergedChildParameters.map((param) => {
        if (param.field === field) {
          return { ...param, visible }
        }
        return param
      })

      updateMergedParameters(updatedParentParams, updatedChildParams)

      debug.log(DebugCategories.PARAMETERS, 'Parameter visibility updated', {
        field,
        visible,
        updatedColumnsCount: updatedColumns.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter visibility:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update parameter visibility')
      )
    }
  }

  function updateParameterOrder(field: string, newOrder: number) {
    debug.log(DebugCategories.PARAMETERS, 'Parameter order update requested', {
      field,
      newOrder,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Update order in parameter columns
      const updatedColumns = [...state.parameterColumns].sort((a, b) => {
        if ('field' in a && 'field' in b) {
          if (a.field === field) return newOrder
          if (b.field === field) return -newOrder
        }
        return 0
      })

      // Update state
      updateParameterColumns(updatedColumns)

      // Update merged parameters with new order
      const updatedParentParams = [...state.mergedParentParameters].sort((a, b) => {
        if (a.field === field) return newOrder
        if (b.field === field) return -newOrder
        return 0
      })

      const updatedChildParams = [...state.mergedChildParameters].sort((a, b) => {
        if (a.field === field) return newOrder
        if (b.field === field) return -newOrder
        return 0
      })

      updateMergedParameters(updatedParentParams, updatedChildParams)

      debug.log(DebugCategories.PARAMETERS, 'Parameter order updated', {
        field,
        newOrder,
        updatedColumnsCount: updatedColumns.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter order:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update parameter order')
      )
    }
  }

  return {
    updateParameterVisibility,
    updateParameterOrder
  }
}
