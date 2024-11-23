import type {
  ElementData,
  TableRow,
  ParameterValue,
  ParameterValueState,
  Parameters
} from '../types'
import { useDebug, DebugCategories } from '../debug/useDebug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

// Initialize debug
const debug = useDebug()

interface DataPipelineResult {
  filteredElements: ElementData[]
  processedElements: ElementData[]
  tableData: TableRow[]
  parameterColumns: ColumnDef[]
}

interface DataPipelineInput {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
}

function isParameterValueState(value: unknown): value is ParameterValueState {
  if (!value || typeof value !== 'object') return false

  const candidate = value as Record<string, unknown>
  return (
    'currentValue' in candidate &&
    'fetchedValue' in candidate &&
    'previousValue' in candidate &&
    'userValue' in candidate
  )
}

function createParameterState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

/**
 * Unified data processing pipeline that handles:
 * - Category filtering
 * - Parent/child relationships
 * - Parameter processing
 * - Table data conversion
 */
export function processDataPipeline({
  allElements,
  selectedParent,
  selectedChild
}: DataPipelineInput): DataPipelineResult {
  // Get active parameters from both default columns
  const allColumns = [...defaultColumns, ...defaultDetailColumns]
  const activeParameters = allColumns.map((col) => col.field)

  debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline', {
    elementCount: allElements.length,
    selectedParent,
    selectedChild
  })

  // Step 1: Filter by categories
  const filteredElements = filterByCategories(
    allElements,
    selectedParent,
    selectedChild
  )

  // Step 2: Process parameters and create columns
  const { processedElements, parameterColumns } = processParameters(
    filteredElements,
    activeParameters
  )

  // Step 3: Convert to table data
  const tableData = convertToTableData(processedElements)

  debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data pipeline complete', {
    filteredCount: filteredElements.length,
    processedCount: processedElements.length,
    columnCount: parameterColumns.length
  })

  return {
    filteredElements,
    processedElements,
    tableData,
    parameterColumns
  }
}

function filterByCategories(
  elements: ElementData[],
  selectedParent: string[],
  selectedChild: string[]
): ElementData[] {
  const filtered = elements.filter((el) => {
    const isParent = !el.isChild
    const isChild = el.isChild

    // If no categories selected, show all
    if (!selectedParent.length && !selectedChild.length) return true

    // Filter based on category and parent/child status
    if (isParent && selectedParent.includes(el.category)) return true
    if (isChild && selectedChild.includes(el.category)) return true

    return false
  })

  return filtered
}

function processParameters(
  elements: ElementData[],
  activeParameters: string[]
): {
  processedElements: ElementData[]
  parameterColumns: ColumnDef[]
} {
  // Get all available columns
  const allColumns = [...defaultColumns, ...defaultDetailColumns]

  // Create columns for active parameters, preserving column properties
  const parameterColumns: ColumnDef[] = activeParameters.map((name) => {
    // Find matching default column
    const defaultColumn = allColumns.find((col) => col.field === name)
    if (!defaultColumn) {
      debug.warn(
        DebugCategories.COLUMN_VALIDATION,
        `No default column found for ${name}`
      )
    }

    // Use default column properties or create new ones
    return (
      defaultColumn || {
        field: name,
        header: name,
        type: 'parameter',
        sortable: true,
        visible: true,
        source: 'Parameters',
        order: 0,
        category: 'Parameters',
        fetchedGroup: 'Parameters',
        currentGroup: 'Parameters',
        isFetched: true,
        description: `Parameter ${name}`,
        isFixed: false,
        isCustomParameter: false
      }
    )
  })

  // Process elements
  const processedElements = elements.map((el) => {
    // Ensure required fields exist
    const processed = {
      ...el,
      mark: el.mark || el.id,
      category: el.category || 'Uncategorized',
      parameters: Object.fromEntries(
        Object.entries(el.parameters || {}).map(([key, value]) => {
          // If it's already a ParameterValueState, use it directly
          if (isParameterValueState(value)) {
            return [key, value]
          }
          // Otherwise create a new ParameterValueState
          return [key, createParameterState(value as ParameterValue)]
        })
      ) as Parameters
    }

    return processed
  })

  return {
    processedElements,
    parameterColumns
  }
}

function convertToTableData(elements: ElementData[]): TableRow[] {
  const tableData = elements.map((el): TableRow => {
    // Process parameters to extract just the values
    const processedParameters = Object.fromEntries(
      Object.entries(el.parameters || {}).map(([key, value]) => {
        // Keep the ParameterValueState structure as is
        return [key, value]
      })
    ) as Parameters

    return {
      id: el.id,
      type: el.type,
      mark: el.mark,
      category: el.category,
      parameters: processedParameters,
      _visible: true,
      isChild: el.isChild,
      host: el.host,
      details: el.details?.map((child): TableRow => {
        // Process child parameters
        const childProcessedParameters = Object.fromEntries(
          Object.entries(child.parameters || {}).map(([key, value]) => {
            // Keep the ParameterValueState structure as is
            return [key, value]
          })
        ) as Parameters

        return {
          id: child.id,
          type: child.type,
          mark: child.mark,
          category: child.category,
          parameters: childProcessedParameters,
          _visible: child._visible,
          _raw: child._raw,
          isChild: child.isChild,
          host: child.host
        }
      })
    }
  })

  return tableData
}
