import { computed, watch } from 'vue'
import type {
  TableRow,
  ElementData,
  ParameterValue,
  ParameterValueState
} from '../types'
import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

interface UseDataTransformationOptions {
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRow[]
    customParameters: Record<string, unknown>
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
  }
  updateTableData: (data: TableRow[]) => void
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
 * Create a ParameterValueState from a raw value
 */
function createParameterValueState(value: unknown): ParameterValueState {
  const paramValue = toParameterValue(value)
  return {
    fetchedValue: paramValue,
    currentValue: paramValue,
    previousValue: paramValue,
    userValue: null
  }
}

/**
 * Creates a TableRow with proper parameter value states
 */
function createTableRow(element: ElementData, columns: ColumnDef[]): TableRow {
  if (!isValidElement(element)) {
    throw new Error('Invalid element data')
  }

  // Create parameters with value states
  const parameters: Record<string, ParameterValueState> = {}

  columns.forEach((column) => {
    const field = column.field
    let value: unknown

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

    // Create parameter value state
    parameters[field] = createParameterValueState(value)
  })

  return {
    id: element.id,
    mark: element.mark,
    category: element.category,
    type: element.type || '',
    host: element.host,
    parameters,
    _visible: true,
    isChild: element.isChild,
    _raw: element._raw
  }
}

/**
 * Handles the transformation of ElementData to TableRow with proper parameter states
 */
export function useDataTransformation({
  state,
  updateTableData,
  handleError
}: UseDataTransformationOptions) {
  // Transform elements to TableRows
  const transformedData = computed<TableRow[]>(() => {
    try {
      // Transform to TableRows with parameter states
      const tableRows = state.evaluatedData
        .filter(isValidElement)
        .map((element) => createTableRow(element, state.mergedTableColumns))

      debug.log(DebugCategories.DATA_TRANSFORM, 'Transformed data:', {
        totalElements: state.evaluatedData.length,
        tableRows: tableRows.length,
        firstRow: tableRows[0]
      })

      return tableRows
    } catch (error) {
      handleError(
        error instanceof Error ? error : new Error('Data transformation failed')
      )
      return []
    }
  })

  // Watch for changes that require update
  watch(
    [() => state.evaluatedData, () => state.mergedTableColumns],
    async () => {
      await processData()
    },
    { deep: true }
  )

  async function processData(): Promise<void> {
    try {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Processing data...', {
        totalElements: state.evaluatedData.length
      })

      await new Promise((resolve) => setTimeout(resolve, 0))

      const tableRows = transformedData.value
      updateTableData(tableRows)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: state.evaluatedData.length,
        displayCount: tableRows.length,
        firstRow: tableRows[0]
      })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      handleError(err)
      debug.error(DebugCategories.ERROR, 'Data processing failed:', err)
      throw err
    }
  }

  async function updateVisibility(id: string, visible: boolean): Promise<void> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 0))

      const updatedData = state.tableData.map((row: TableRow) =>
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
