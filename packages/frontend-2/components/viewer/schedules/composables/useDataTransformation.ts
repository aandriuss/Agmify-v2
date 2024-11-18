import { computed, watch, type ComputedRef } from 'vue'
import type { TableRowData, ParameterValue, ElementData } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

interface UseDataTransformationOptions {
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRowData[]
    customParameters: Record<string, unknown>
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
  }
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  updateTableData: (data: TableRowData[]) => void
  handleError: (error: Error) => void
}

function isValidElement(element: unknown): element is ElementData {
  if (!element || typeof element !== 'object') return false
  const e = element as ElementData
  return (
    typeof e.id === 'string' &&
    typeof e.category === 'string' &&
    typeof e.parameters === 'object'
  )
}

/**
 * Filter elements based on selected categories
 */
function filterElementsByCategory(
  elements: ElementData[],
  selectedParentCategories: string[],
  selectedChildCategories: string[]
): ElementData[] {
  // If no categories selected, return all elements
  if (selectedParentCategories.length === 0 && selectedChildCategories.length === 0) {
    return elements
  }

  return elements.filter((element) => {
    const isParent = !element.host // Elements without host are parent elements
    if (isParent) {
      return (
        selectedParentCategories.length === 0 ||
        selectedParentCategories.includes(element.category)
      )
    } else {
      return (
        selectedChildCategories.length === 0 ||
        selectedChildCategories.includes(element.category)
      )
    }
  })
}

/**
 * Creates a display row with proper type conversion
 */
function createDisplayRow(element: ElementData, columns: ColumnDef[]): TableRowData {
  if (!isValidElement(element)) {
    throw new Error('Invalid element data')
  }

  const parameters = element.parameters as Record<string, ParameterValue>

  // Map column fields to data values
  const data = columns.reduce<Record<string, ParameterValue>>((acc, column) => {
    const field = column.field
    let value: ParameterValue = ''

    // Handle special fields
    if (field === 'mark') {
      value = element.id
    } else if (field === 'category') {
      value = element.category
    } else if (field === 'type') {
      value = element.type || ''
    } else if (field === 'host') {
      value = element.host || ''
    } else {
      // Get value from parameters
      value = parameters[field] ?? ''
    }

    acc[field] = value
    return acc
  }, {})

  return {
    id: element.id,
    mark: element.id,
    category: element.category,
    type: element.type || '',
    parameters,
    _visible: true,
    details: undefined,
    data
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
  // Filter elements by category and transform into display rows
  const transformedData = computed<TableRowData[]>(() => {
    const filteredElements = filterElementsByCategory(
      state.evaluatedData,
      selectedParentCategories.value,
      selectedChildCategories.value
    )

    return filteredElements
      .filter(isValidElement)
      .map((element) => createDisplayRow(element, state.mergedTableColumns))
  })

  // Watch for changes that require display update
  watch(
    [
      () => state.evaluatedData,
      () => state.mergedTableColumns,
      selectedParentCategories,
      selectedChildCategories
    ],
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
      debug.log(DebugCategories.DATA_TRANSFORM, 'Processing data...', {
        totalElements: state.evaluatedData.length,
        selectedParentCategories: selectedParentCategories.value,
        selectedChildCategories: selectedChildCategories.value
      })

      // Simulate async processing
      await new Promise((resolve) => setTimeout(resolve, 0))

      const displayData = transformedData.value.map((row) => ({ ...row }))
      updateTableData(displayData)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: state.evaluatedData.length,
        displayCount: displayData.length,
        parentCategories: selectedParentCategories.value,
        childCategories: selectedChildCategories.value,
        firstRow: displayData[0]?.data,
        columns: state.mergedTableColumns.map((c) => c.field)
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
