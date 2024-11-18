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
import { parentCategories, childCategories } from '../config/categories'

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

function determineElementType(
  element: ElementData,
  selectedParent: string[],
  selectedChild: string[]
): 'parent' | 'child' {
  // If no categories are selected, treat all elements as parents
  if (selectedParent.length === 0 && selectedChild.length === 0) {
    return 'parent'
  }

  // Check if element's category is in parent or child categories
  const isParentCategory = parentCategories.includes(element.category)
  const isChildCategory = childCategories.includes(element.category)

  // If element's category is in parent categories or is Uncategorized, treat as parent
  if (isParentCategory || element.category === 'Uncategorized') {
    return 'parent'
  }

  // If element's category is in child categories, treat as child
  if (isChildCategory) {
    return 'child'
  }

  // Default to parent for any other cases
  return 'parent'
}

function transformToTableData(
  elements: ElementData[],
  selectedParent: string[],
  selectedChild: string[]
): TableRowData[] {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting table data transformation', {
    elementCount: elements.length,
    elementCategories: [...new Set(elements.map((el) => el.category))]
  })

  // Create a map for quick parent lookup
  const parentMap = new Map<string, ElementData>()
  elements.forEach((element) => {
    if (
      element.mark &&
      determineElementType(element, selectedParent, selectedChild) === 'parent'
    ) {
      parentMap.set(element.mark, element)
    }
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Parent map created', {
    parentCount: parentMap.size,
    parentCategories: [...new Set([...parentMap.values()].map((el) => el.category))]
  })

  // Transform elements to table rows with proper parent-child relationships
  const tableData = elements.map((element) => {
    const elementType = determineElementType(element, selectedParent, selectedChild)
    const row = {
      ...element,
      _visible: true,
      isChild: elementType === 'child',
      details: element.details?.map((detail) => {
        // Ensure host field is set for child elements
        const childRow: TableRowData = {
          ...detail,
          _visible: true,
          isChild: true,
          host: detail.host || element.mark // Use parent's mark as host if not set
        }

        // Flatten and copy parameters to top level for table display
        if (detail.parameters) {
          const flatParams = flattenParameters(detail.parameters)
          Object.entries(flatParams).forEach(([key, value]) => {
            ;(childRow as Record<string, ParameterValue>)[key] = value
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
    }

    // If this is a child element (has host), find its parent's details
    if (element.host && parentMap.has(element.host)) {
      const parent = parentMap.get(element.host)
      if (parent) {
        row.parentCategory = parent.category
        row.parentMark = parent.mark
      }
    }

    return row
  })

  // Filter out child elements that don't have a valid parent
  const filteredTableData = tableData.filter((row) => {
    if (row.isChild) {
      return row.host && parentMap.has(row.host)
    }
    return true
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Table data transformation complete', {
    rowCount: filteredTableData.length,
    rowCategories: [...new Set(filteredTableData.map((row) => row.category))],
    sampleRow: filteredTableData[0],
    sampleParameters: Object.keys(filteredTableData[0] || {}).filter(
      (key) =>
        ![
          'id',
          'type',
          'mark',
          'category',
          'parameters',
          'details',
          '_visible',
          'isChild'
        ].includes(key)
    )
  })

  return filteredTableData
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
  const tableData = transformToTableData(
    processedElements,
    selectedParent,
    selectedChild
  )

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
