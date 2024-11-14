import { watch } from 'vue'
import { debug, DebugCategories } from '../utils/debug'
import type { ComputedRef } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { processDataPipeline } from '../utils/dataPipeline'

interface DataTransformationOptions {
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRowData[]
    customParameters: CustomParameter[]
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
  }
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  updateTableData: (data: TableRowData[]) => void
  updateEvaluatedData: (data: ElementData[]) => void
  handleError: (error: Error) => void
}

export function useDataTransformation(options: DataTransformationOptions) {
  const {
    state,
    updateTableData,
    updateEvaluatedData,
    handleError,
    selectedParentCategories,
    selectedChildCategories
  } = options

  function processData() {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Processing schedule data', {
      dataCount: state.scheduleData.length,
      customParametersCount: state.customParameters.length,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Process data through pipeline
      const result = processDataPipeline({
        allElements: state.scheduleData,
        selectedParent: selectedParentCategories.value,
        selectedChild: selectedChildCategories.value
      })

      // Update state
      updateEvaluatedData(result.processedElements)
      updateTableData(result.tableData)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: result.processedElements.length,
        tableRows: result.tableData.length
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

  // Add watch for scheduleData changes
  watch(
    () => state.scheduleData,
    (newData) => {
      if (newData.length > 0) {
        debug.log(
          DebugCategories.DATA_TRANSFORM,
          'Schedule data changed, processing...',
          {
            dataCount: newData.length
          }
        )
        processData()
      }
    },
    { immediate: true }
  )

  // Add watch for category changes
  watch(
    [selectedParentCategories, selectedChildCategories],
    () => {
      if (state.scheduleData.length > 0) {
        debug.log(DebugCategories.DATA_TRANSFORM, 'Categories changed, processing...', {
          parentCategories: selectedParentCategories.value,
          childCategories: selectedChildCategories.value
        })
        processData()
      }
    },
    { immediate: true }
  )

  // Add watch for custom parameters
  watch(
    () => state.customParameters,
    () => {
      if (state.scheduleData.length > 0) {
        debug.log(
          DebugCategories.DATA_TRANSFORM,
          'Custom parameters changed, processing...',
          {
            parameterCount: state.customParameters.length
          }
        )
        processData()
      }
    },
    { immediate: true, deep: true }
  )

  return {
    processData,
    updateVisibility
  }
}
