import type {
  ElementData,
  AvailableHeaders,
  TableRowData,
  ParameterValue
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from './debug'
import { filterElements } from '../composables/useElementCategories'
import { processParameters } from '../composables/useElementParameters'

interface PipelineResult {
  filteredElements: ElementData[]
  processedElements: ElementData[]
  tableData: TableRowData[]
  parameterColumns: ColumnDef[]
  availableHeaders: AvailableHeaders
}

interface PipelineOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

function flattenParameters(
  parameters: Record<string, ParameterValue> | undefined
): Record<string, ParameterValue> {
  const result: Record<string, ParameterValue> = {}

  if (!parameters) return result

  function flatten(obj: Record<string, unknown>, prefix = '') {
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = prefix ? `${prefix}.${key}` : key
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, newKey)
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        result[newKey] = value
      }
    })
  }

  flatten(parameters)
  return result
}

function transformToTableData(elements: ElementData[]): TableRowData[] {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting table data transformation', {
    elementCount: elements.length,
    elementCategories: [...new Set(elements.map((el) => el.category))]
  })

  // Create a map for quick parent lookup
  const parentMap = new Map<string, ElementData>()
  elements.forEach((element) => {
    if (element.mark) {
      parentMap.set(element.mark, element)
    }
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Parent map created', {
    parentCount: parentMap.size,
    parentCategories: [...new Set([...parentMap.values()].map((el) => el.category))]
  })

  // Transform elements to table rows with proper parent-child relationships
  const tableData = elements.map((element) => {
    const row = {
      ...element,
      _visible: true,
      details: element.details?.map((detail) => {
        // Ensure host field is set for child elements
        const childRow: TableRowData = {
          ...detail,
          _visible: true,
          host: detail.host || element.mark // Use parent's mark as host if not set
        }

        // Flatten and copy parameters to top level for table display
        if (detail.parameters) {
          const flatParams = flattenParameters(detail.parameters)
          Object.entries(flatParams).forEach(([key, value]) => {
            ;(childRow as Record<string, ParameterValue>)[key] = value
          })

          debug.log(DebugCategories.DATA_TRANSFORM, 'Child parameters flattened', {
            parentMark: element.mark,
            childMark: detail.mark,
            category: detail.category,
            parameterCount: Object.keys(flatParams).length,
            parameters: Object.keys(flatParams)
          })
        }

        // Copy any additional parameters from raw data
        if (detail._raw) {
          const rawParams = flattenParameters(
            detail._raw as Record<string, ParameterValue>
          )
          Object.entries(rawParams).forEach(([key, value]) => {
            if (!(key in childRow)) {
              ;(childRow as Record<string, ParameterValue>)[key] = value
            }
          })

          debug.log(DebugCategories.DATA_TRANSFORM, 'Child raw parameters added', {
            parentMark: element.mark,
            childMark: detail.mark,
            category: detail.category,
            rawParameterCount: Object.keys(rawParams).length,
            rawParameters: Object.keys(rawParams)
          })
        }

        return childRow
      })
    } as TableRowData

    // Flatten and copy parameters to top level for table display
    if (element.parameters) {
      const flatParams = flattenParameters(element.parameters)
      Object.entries(flatParams).forEach(([key, value]) => {
        ;(row as Record<string, ParameterValue>)[key] = value
      })

      debug.log(DebugCategories.DATA_TRANSFORM, 'Parent parameters flattened', {
        mark: element.mark,
        category: element.category,
        parameterCount: Object.keys(flatParams).length,
        parameters: Object.keys(flatParams)
      })
    }

    // Copy any additional parameters from raw data
    if (element._raw) {
      const rawParams = flattenParameters(
        element._raw as Record<string, ParameterValue>
      )
      Object.entries(rawParams).forEach(([key, value]) => {
        if (!(key in row)) {
          ;(row as Record<string, ParameterValue>)[key] = value
        }
      })

      debug.log(DebugCategories.DATA_TRANSFORM, 'Parent raw parameters added', {
        mark: element.mark,
        category: element.category,
        rawParameterCount: Object.keys(rawParams).length,
        rawParameters: Object.keys(rawParams)
      })
    }

    // If this is a child element (has host), find its parent's details
    if (element.host && parentMap.has(element.host)) {
      const parent = parentMap.get(element.host)
      if (parent) {
        row.parentCategory = parent.category
        row.parentMark = parent.mark

        debug.log(DebugCategories.DATA_TRANSFORM, 'Parent details added to child', {
          childMark: element.mark,
          childCategory: element.category,
          parentMark: parent.mark,
          parentCategory: parent.category
        })
      }
    }

    return row
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Table data transformation complete', {
    rowCount: tableData.length,
    rowCategories: [...new Set(tableData.map((row) => row.category))],
    sampleRow: tableData[0],
    sampleParameters: Object.keys(tableData[0] || {}).filter(
      (key) =>
        ![
          'id',
          'type',
          'mark',
          'category',
          'parameters',
          'details',
          '_visible'
        ].includes(key)
    )
  })

  return tableData
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
  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline', {
    totalElements: allElements.length,
    selectedParentCategories: selectedParent,
    selectedChildCategories: selectedChild,
    essentialFieldsOnly,
    allCategories: [...new Set(allElements.map((el) => el.category))]
  })

  // Step 1: Filter elements
  const { filteredElements } = filterElements({
    allElements,
    selectedParent,
    selectedChild,
    essentialFieldsOnly
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Elements filtered', {
    filteredCount: filteredElements.length,
    filteredCategories: [...new Set(filteredElements.map((el) => el.category))]
  })

  // Step 2: Process parameters
  const { processedElements, parameterColumns, availableHeaders } = processParameters({
    filteredElements,
    essentialFieldsOnly
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Parameters processed', {
    processedCount: processedElements.length,
    columnCount: parameterColumns.length,
    headerCount: {
      parent: availableHeaders.parent.length,
      child: availableHeaders.child.length
    }
  })

  // Step 3: Transform to table data
  const tableData = transformToTableData(processedElements)

  debug.log(DebugCategories.DATA_TRANSFORM, 'Data pipeline complete', {
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

  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting debug element processing', {
    totalElements: elements.length,
    elementCategories: [...new Set(elements.map((el) => el.category))]
  })

  // Create a map for quick parent lookup
  const parentMap = new Map<string, ElementData>()
  elements.forEach((el) => {
    if (el.mark) {
      parentMap.set(el.mark, el)
    }
  })

  const parentElements = elements.filter((el) => !el.host)
  const childElements = elements.filter((el) => !!el.host)
  const matchedElements = elements.filter((el) => {
    // Element is matched if it has children or if it's a child with a valid host
    return !!el.details?.length || (!!el.host && parentMap.has(el.host))
  })
  const orphanedElements = elements.filter((el) => {
    // Element is orphaned if it has a host but the host doesn't exist
    return !!el.host && !parentMap.has(el.host)
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Debug elements processed', {
    parentCount: parentElements.length,
    childCount: childElements.length,
    matchedCount: matchedElements.length,
    orphanedCount: orphanedElements.length,
    parentCategories: [...new Set(parentElements.map((el) => el.category))],
    childCategories: [...new Set(childElements.map((el) => el.category))],
    sampleParent: parentElements[0],
    sampleChild: childElements[0],
    sampleOrphaned: orphanedElements[0]
  })

  return {
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  }
}
