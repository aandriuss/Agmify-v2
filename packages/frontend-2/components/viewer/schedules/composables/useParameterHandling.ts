import { debug, DebugCategories } from '../debug/useDebug'
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

// Helper function to get parameter group from field
function getParameterGroup(field: string): string {
  const parts = field.split('.')
  return parts.length > 1 ? parts[0] : 'root'
}

// Helper function to get all fields in the same group
function getGroupFields(field: string, columns: ColumnDef[]): string[] {
  const group = getParameterGroup(field)
  return columns
    .filter((col): col is ColumnDef & { field: string } => 'field' in col)
    .map((col) => col.field)
    .filter((colField) => getParameterGroup(colField) === group)
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
      group: getParameterGroup(field),
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Get all fields in the same group
      const groupFields = getGroupFields(field, state.parameterColumns)

      // Update visibility in parameter columns
      const updatedColumns = state.parameterColumns.map((col) => {
        if ('field' in col && groupFields.includes(col.field)) {
          return { ...col, visible }
        }
        return col
      })

      // Update state
      updateParameterColumns(updatedColumns)

      // Update merged parameters
      const updatedParentParams = state.mergedParentParameters.map((param) => {
        if (groupFields.includes(param.field)) {
          return { ...param, visible }
        }
        return param
      })

      const updatedChildParams = state.mergedChildParameters.map((param) => {
        if (groupFields.includes(param.field)) {
          return { ...param, visible }
        }
        return param
      })

      updateMergedParameters(updatedParentParams, updatedChildParams)

      debug.log(DebugCategories.PARAMETERS, 'Parameter visibility updated', {
        field,
        group: getParameterGroup(field),
        visible,
        updatedColumnsCount: updatedColumns.length,
        groupFieldsCount: groupFields.length
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
      group: getParameterGroup(field),
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Get all fields in the same group
      const groupFields = getGroupFields(field, state.parameterColumns)
      const group = getParameterGroup(field)

      // Sort function for ColumnDef
      function sortColumns(
        a: ColumnDef & { field: string },
        b: ColumnDef & { field: string }
      ): number {
        const aGroup = getParameterGroup(a.field)
        const bGroup = getParameterGroup(b.field)

        if (aGroup === bGroup) {
          if (groupFields.includes(a.field)) return newOrder
          if (groupFields.includes(b.field)) return -newOrder
          return 0
        }

        if (aGroup === group) return newOrder
        if (bGroup === group) return -newOrder
        return 0
      }

      // Sort function for CustomParameter
      function sortParameters(a: CustomParameter, b: CustomParameter): number {
        const aGroup = getParameterGroup(a.field)
        const bGroup = getParameterGroup(b.field)

        if (aGroup === bGroup) {
          if (groupFields.includes(a.field)) return newOrder
          if (groupFields.includes(b.field)) return -newOrder
          return 0
        }

        if (aGroup === group) return newOrder
        if (bGroup === group) return -newOrder
        return 0
      }

      // Update order in parameter columns
      const updatedColumns = [...state.parameterColumns]
        .filter((col): col is ColumnDef & { field: string } => 'field' in col)
        .sort(sortColumns)

      // Update state
      updateParameterColumns(updatedColumns)

      // Update merged parameters with new order
      const updatedParentParams = [...state.mergedParentParameters].sort(sortParameters)
      const updatedChildParams = [...state.mergedChildParameters].sort(sortParameters)

      updateMergedParameters(updatedParentParams, updatedChildParams)

      debug.log(DebugCategories.PARAMETERS, 'Parameter order updated', {
        field,
        group: getParameterGroup(field),
        newOrder,
        updatedColumnsCount: updatedColumns.length,
        groupFieldsCount: groupFields.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter order:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update parameter order')
      )
    }
  }

  function updateGroupVisibility(group: string, visible: boolean) {
    debug.log(DebugCategories.PARAMETERS, 'Group visibility update requested', {
      group,
      visible,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Update visibility for all parameters in the group
      const updatedColumns = state.parameterColumns.map((col) => {
        if ('field' in col && getParameterGroup(col.field) === group) {
          return { ...col, visible }
        }
        return col
      })

      // Update state
      updateParameterColumns(updatedColumns)

      // Update merged parameters
      const updatedParentParams = state.mergedParentParameters.map((param) => {
        if (getParameterGroup(param.field) === group) {
          return { ...param, visible }
        }
        return param
      })

      const updatedChildParams = state.mergedChildParameters.map((param) => {
        if (getParameterGroup(param.field) === group) {
          return { ...param, visible }
        }
        return param
      })

      updateMergedParameters(updatedParentParams, updatedChildParams)

      debug.log(DebugCategories.PARAMETERS, 'Group visibility updated', {
        group,
        visible,
        updatedColumnsCount: updatedColumns.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update group visibility:', err)
      handleError(
        err instanceof Error ? err : new Error('Failed to update group visibility')
      )
    }
  }

  return {
    updateParameterVisibility,
    updateParameterOrder,
    updateGroupVisibility
  }
}
