import type {
  ElementData,
  TableRow,
  ParameterValue,
  ParameterValueState,
  Parameters
} from '../types'
import { debug, DebugCategories } from './debug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

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

  debug.log(DebugCategories.DATA, 'Starting data pipeline', {
    elementCount: allElements.length,
    selectedParent,
    selectedChild,
    activeParameters,
    columns: allColumns.map((col) => ({
      field: col.field,
      header: col.header,
      type: col.type,
      order: col.order
    }))
  })

  // Log available parameters in first few elements
  debug.log(DebugCategories.DATA, 'Available parameters in data:', {
    sampleElements: allElements.slice(0, 3).map((el) => ({
      id: el.id,
      category: el.category,
      parameterKeys: Object.keys(el.parameters || {}),
      activeParametersPresent: activeParameters.map((param) => ({
        parameter: param,
        present: param in (el.parameters || {}),
        value: el.parameters?.[param]?.currentValue
      }))
    }))
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

  // Log final data structure
  debug.log(DebugCategories.DATA, 'Data pipeline complete', {
    filteredCount: filteredElements.length,
    processedCount: processedElements.length,
    tableDataCount: tableData.length,
    columnCount: parameterColumns.length,
    activeParameters,
    sampleRow: tableData[0]
      ? {
          id: tableData[0].id,
          category: tableData[0].category,
          parameterKeys: Object.keys(tableData[0].parameters || {}),
          activeParametersPresent: activeParameters.map((param) => ({
            parameter: param,
            present: param in (tableData[0].parameters || {}),
            value: tableData[0].parameters?.[param]?.currentValue
          }))
        }
      : null,
    columns: parameterColumns.map((col) => ({
      field: col.field,
      header: col.header,
      visible: col.visible,
      source: col.source,
      order: col.order
    }))
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

  debug.log(DebugCategories.DATA, 'Category filtering complete', {
    inputCount: elements.length,
    outputCount: filtered.length,
    selectedParent,
    selectedChild
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

  // Log what parameters are actually in the data
  const sampleElement = elements[0]
  debug.log(DebugCategories.DATA, 'Sample element:', {
    id: sampleElement?.id,
    mark: sampleElement?.mark,
    category: sampleElement?.category,
    parameters: sampleElement?.parameters ? Object.keys(sampleElement.parameters) : [],
    raw: sampleElement?._raw
  })

  // Create columns for active parameters, preserving column properties
  const parameterColumns: ColumnDef[] = activeParameters.map((name) => {
    // Find matching default column
    const defaultColumn = allColumns.find((col) => col.field === name)
    if (!defaultColumn) {
      debug.warn(DebugCategories.DATA, `No default column found for ${name}`)
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

  // Log what columns we're creating
  debug.log(DebugCategories.DATA, 'Creating columns:', {
    activeParameters,
    columns: parameterColumns.map((col) => ({
      field: col.field,
      header: col.header,
      type: col.type
    }))
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

    // Log processed element
    debug.log(DebugCategories.DATA, 'Processed element:', {
      id: processed.id,
      mark: processed.mark,
      category: processed.category,
      parameterCount: Object.keys(processed.parameters).length,
      parameters: Object.keys(processed.parameters)
    })

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
      _visible: el._visible,
      _raw: el._raw,
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

  debug.log(DebugCategories.DATA, 'Table data conversion complete', {
    inputCount: elements.length,
    outputCount: tableData.length,
    sampleRow: tableData[0]
      ? {
          id: tableData[0].id,
          parameterKeys: Object.keys(tableData[0].parameters || {}),
          parameterValues: Object.entries(tableData[0].parameters || {}).reduce(
            (acc, [key, value]) => {
              acc[key] = value.currentValue
              return acc
            },
            {} as Record<string, ParameterValue>
          )
        }
      : null
  })

  return tableData
}
