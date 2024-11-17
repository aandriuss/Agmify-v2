import { computed, watch, type ComputedRef } from 'vue'
import type { TableRowData, ParameterValue } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import type { ElementData } from '../core/types'

interface UseDataTransformationOptions {
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRowData[]
    customParameters: Record<string, unknown>
    mergedTableColumns: unknown[]
    mergedDetailColumns: unknown[]
  }
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  updateTableData: (data: TableRowData[]) => void
  handleError: (error: Error) => void
}

/**
 * Creates a display row with proper type conversion
 */
function createDisplayRow(element: ElementData): TableRowData {
  const parameters = element.parameters as Record<string, ParameterValue>
  return {
    id: element.id,
    mark: element.id, // Use id as mark since it's required
    category: element.category,
    type: '',
    parameters,
    _visible: true,
    details: undefined,
    data: {}
  }
}

/**
 * Handles the final transformation into display-ready table rows.
 * This is the last step in the pipeline, after parameter processing.
 */
export function useDataTransformation({
  state,
  selectedParentCategories,
  selectedChildCategories,
  updateTableData,
  handleError
}: UseDataTransformationOptions) {
  // Transform evaluated elements into display rows
  const transformedData = computed<TableRowData[]>(() => {
    const elements = state.evaluatedData
    return elements.map(createDisplayRow)
  })

  // Watch for changes that require display update
  watch(
    [() => state.evaluatedData, selectedParentCategories, selectedChildCategories],
    async () => {
      await processData()
    },
    { deep: true }
  )

  /**
   * Process data through the transformation pipeline
   */
  async function processData(): Promise<void> {
    try {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Processing data...')

      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 0))

      const displayData = transformedData.value.map((row) => ({ ...row }))
      updateTableData(displayData)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: state.evaluatedData.length,
        displayCount: displayData.length,
        parentCategories: selectedParentCategories.value.length,
        childCategories: selectedChildCategories.value.length
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      handleError(err)
      debug.error(DebugCategories.ERROR, 'Data processing failed:', err)
      throw err
    }
  }

  /**
   * Update visibility state for a display row
   */
  async function updateVisibility(id: string, visible: boolean): Promise<void> {
    try {
      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 0))

      const updatedData = state.tableData.map((row: TableRowData) =>
        row.id === id ? { ...row, _visible: visible } : row
      )

      updateTableData(updatedData)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Visibility updated', {
        id,
        visible
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      handleError(err)
      debug.error(DebugCategories.ERROR, 'Visibility update failed:', err)
      throw err
    }
  }

  return {
    processData,
    updateVisibility,
    transformedData
  }
}
