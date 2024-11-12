import { debug, DebugCategories } from '../utils/debug'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'

interface DataTransformationOptions {
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRowData[]
    customParameters: CustomParameter[]
    selectedParentCategories: string[]
    selectedChildCategories: string[]
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
  }
  updateTableData: (data: TableRowData[]) => void
  updateEvaluatedData: (data: ElementData[]) => void
  handleError: (error: Error) => void
}

export function useDataTransformation(options: DataTransformationOptions) {
  const { state, updateTableData, updateEvaluatedData, handleError } = options

  function evaluateCustomParameters(element: ElementData): ElementData {
    const evaluatedElement = { ...element }

    state.customParameters.forEach((param) => {
      if (!param.visible) return

      try {
        if (param.type === 'fixed') {
          evaluatedElement[param.field] = param.value
        } else if (param.type === 'equation' && param.equation) {
          // Here you would evaluate the equation using the element's data
          // This is a placeholder for equation evaluation logic
          evaluatedElement[param.field] = 'Equation result'
        }
      } catch (err) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Failed to evaluate parameter', {
          parameter: param,
          element,
          error: err
        })
      }
    })

    return evaluatedElement
  }

  function filterByCategories(data: ElementData[]): ElementData[] {
    return data.filter((element) => {
      const isParentMatch =
        state.selectedParentCategories.length === 0 ||
        state.selectedParentCategories.includes(element.category)

      const hasMatchingChildren =
        element.details?.some(
          (child) =>
            state.selectedChildCategories.length === 0 ||
            state.selectedChildCategories.includes(child.category)
        ) ?? false

      return isParentMatch && (hasMatchingChildren || !element.details?.length)
    })
  }

  function transformToTableRows(data: ElementData[]): TableRowData[] {
    return data.map((element) => {
      const row: TableRowData = {
        ...element,
        _visible: true,
        details: element.details?.map((detail) => ({
          ...detail,
          _visible: true
        }))
      }

      // Add custom parameter values
      state.customParameters.forEach((param) => {
        if (param.visible && row[param.field] === undefined) {
          row[param.field] = null
        }
      })

      return row
    })
  }

  function processData() {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Processing schedule data', {
      dataCount: state.scheduleData.length,
      customParametersCount: state.customParameters.length
    })

    try {
      // Step 1: Evaluate custom parameters
      const evaluatedData = state.scheduleData.map((element) => {
        const evaluatedElement = evaluateCustomParameters(element)
        if (element.details) {
          evaluatedElement.details = element.details.map((child) =>
            evaluateCustomParameters(child)
          )
        }
        return evaluatedElement
      })

      // Step 2: Filter by selected categories
      const filteredData = filterByCategories(evaluatedData)

      // Step 3: Transform to table rows
      const tableRows = transformToTableRows(filteredData)

      // Update state
      updateEvaluatedData(evaluatedData)
      updateTableData(tableRows)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: evaluatedData.length,
        filteredCount: filteredData.length,
        tableRowsCount: tableRows.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process data:', err)
      handleError(err instanceof Error ? err : new Error('Failed to process data'))
    }
  }

  function updateVisibility(elementId: string, visible: boolean) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Updating element visibility', {
      elementId,
      visible
    })

    try {
      const updatedData = state.tableData.map((row) => {
        if (row.id === elementId) {
          return { ...row, _visible: visible }
        }
        if (row.details) {
          return {
            ...row,
            details: row.details.map((detail) =>
              detail.id === elementId ? { ...detail, _visible: visible } : detail
            )
          }
        }
        return row
      })

      updateTableData(updatedData)
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update visibility:', err)
      handleError(err instanceof Error ? err : new Error('Failed to update visibility'))
    }
  }

  return {
    processData,
    updateVisibility,
    evaluateCustomParameters,
    filterByCategories,
    transformToTableRows
  }
}
