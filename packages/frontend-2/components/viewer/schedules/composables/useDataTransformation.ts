import { computed, watch, type ComputedRef } from 'vue'
import type { TableRowData, ElementData, ParameterValue } from '../types'
import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { parentCategories, childCategories } from '../config/categories'

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

function isParentElement(element: ElementData): boolean {
  return (
    parentCategories.includes(element.category) || element.category === 'Uncategorized'
  )
}

/**
 * Convert a value to a valid ParameterValue
 */
function toParameterValue(value: unknown): ParameterValue {
  if (value === null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value
  return String(value)
}

/**
 * Creates a display row with proper type conversion, using only active parameters
 */
function createDisplayRow(element: ElementData, columns: ColumnDef[]): TableRowData {
  if (!isValidElement(element)) {
    throw new Error('Invalid element data')
  }

  // Get only the parameters that correspond to active columns
  const activeParameters: Record<string, ParameterValue> = {}
  const displayData: Record<string, ParameterValue> = {}

  columns.forEach((column) => {
    const field = column.field
    let value: ParameterValue

    // Handle special fields
    if (field === 'mark') {
      value = element.mark
    } else if (field === 'category') {
      value = element.category
    } else if (field === 'type') {
      value = element.type || ''
    } else if (field === 'host') {
      value = element.host || ''
    } else if (element.parameters && field in element.parameters) {
      value = element.parameters[field]
    } else {
      value = ''
    }

    // Ensure value is a valid ParameterValue
    const paramValue = toParameterValue(value)
    activeParameters[field] = paramValue
    displayData[field] = paramValue
  })

  return {
    id: element.id,
    mark: element.mark,
    category: element.category,
    type: element.type || '',
    parameters: activeParameters,
    _visible: true,
    details: element.details,
    data: displayData
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
    try {
      // Get filtered elements based on selected categories
      const filteredElements = state.evaluatedData.filter((element) => {
        const isParent = isParentElement(element)
        if (isParent) {
          return (
            selectedParentCategories.value.length === 0 ||
            selectedParentCategories.value.includes(element.category)
          )
        } else {
          return (
            selectedChildCategories.value.length === 0 ||
            selectedChildCategories.value.includes(element.category)
          )
        }
      })

      // Get active columns (these represent active parameters)
      const activeColumns = state.mergedTableColumns.filter((col) => col.visible)

      // Transform filtered elements to table rows with only active parameters
      const displayRows = filteredElements
        .filter(isValidElement)
        .map((element) => createDisplayRow(element, activeColumns))

      debug.log(DebugCategories.DATA_TRANSFORM, 'Transformed data:', {
        totalElements: state.evaluatedData.length,
        filteredElements: filteredElements.length,
        displayRows: displayRows.length,
        parentCategories: selectedParentCategories.value,
        childCategories: selectedChildCategories.value,
        activeColumns: activeColumns.length,
        firstRow: displayRows[0]
      })

      return displayRows
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('Data transformation failed')
      )
      return []
    }
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
        selectedChildCategories: selectedChildCategories.value,
        activeColumns: state.mergedTableColumns.filter((col) => col.visible).length
      })

      // Add minimal delay to ensure async context
      await new Promise((resolve) => setTimeout(resolve, 0))

      const displayData = transformedData.value
      updateTableData(displayData)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: state.evaluatedData.length,
        displayCount: displayData.length,
        parentCategories: selectedParentCategories.value,
        childCategories: selectedChildCategories.value,
        firstRow: displayData[0]?.data,
        parameters: displayData[0]?.parameters,
        activeColumns: state.mergedTableColumns
          .filter((col) => col.visible)
          .map((c) => c.field)
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
      // Add minimal delay to ensure async context
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
