import type { ElementData, AvailableHeaders, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from './debug'
import { filterElements } from '../composables/useElementCategories'
import { processParameters } from '../composables/useElementParameters'

interface PipelineResult {
  filteredElements: ElementData[]
  processedElements: ElementData[]
  tableData: TableRowData[] // Added this line
  parameterColumns: ColumnDef[]
  availableHeaders: AvailableHeaders
}

interface PipelineOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

function transformToTableData(elements: ElementData[]): TableRowData[] {
  return elements.map((element) => {
    const row: TableRowData = {
      ...element,
      _visible: true,
      details: element.details?.map((detail) => ({
        ...detail,
        _visible: true
      }))
    }

    // Ensure all fields are properly converted for table display
    if (row.parameters) {
      Object.entries(row.parameters).forEach(([key, value]) => {
        row[key] = value
      })
    }

    return row
  })
}

/**
 * Pure function to process data through the pipeline
 */
export function processDataPipeline({
  allElements,
  selectedParent,
  selectedChild,
  essentialFieldsOnly = false
}: PipelineOptions): PipelineResult {
  // Step 1: Filter elements
  const { filteredElements } = filterElements({
    allElements,
    selectedParent,
    selectedChild,
    essentialFieldsOnly
  })

  // Step 2: Process parameters
  const { processedElements, parameterColumns, availableHeaders } = processParameters({
    filteredElements,
    essentialFieldsOnly
  })

  // Step 3: Transform to table data
  const tableData = transformToTableData(processedElements)

  debug.log(DebugCategories.DATA, 'Data pipeline complete', {
    sourceElements: allElements.length,
    filteredElements: filteredElements.length,
    processedElements: processedElements.length,
    tableRows: tableData.length,
    parameterColumns: parameterColumns.length,
    essentialFieldsOnly,
    availableHeaders: {
      parent: availableHeaders.parent.length,
      child: availableHeaders.child.length
    }
  })

  return {
    filteredElements,
    processedElements,
    tableData,
    parameterColumns,
    availableHeaders
  }
}

/**
 * Pure function to process debug elements
 */
export function processDebugElements(elements: ElementData[]) {
  if (!elements?.length) {
    return {
      parentElements: [],
      childElements: [],
      matchedElements: [],
      orphanedElements: []
    }
  }

  const parentElements = elements.filter((el) => !el.host)
  const childElements = elements.filter((el) => !!el.host)
  const matchedElements = elements.filter((el) => !!el.details?.length)
  const orphanedElements = elements.filter((el) => !!el.host && !el.details?.length)

  debug.log(DebugCategories.DATA, 'Debug elements processed', {
    parentCount: parentElements.length,
    childCount: childElements.length,
    matchedCount: matchedElements.length,
    orphanedCount: orphanedElements.length
  })

  return {
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  }
}
