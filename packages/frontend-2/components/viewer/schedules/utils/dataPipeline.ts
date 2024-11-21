import type {
  TableRow,
  AvailableHeaders,
  ParameterValue,
  ParameterValueState,
  Parameters,
  BIMNodeRaw
} from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug, DebugCategories } from './debug'
import { filterElements } from '../composables/useElementCategories'
import { processParameters } from '../composables/useElementParameters'
import { parentCategories, childCategories } from '../config/categories'

interface PipelineResult {
  filteredElements: TableRow[]
  processedElements: TableRow[]
  tableData: TableRow[]
  parameterColumns: ColumnDef[]
  availableHeaders: AvailableHeaders
}

interface PipelineOptions {
  allElements: BIMNodeRaw[]
  selectedParent: string[]
  selectedChild: string[]
  essentialFieldsOnly?: boolean
}

function createParameterState(value: ParameterValue): ParameterValueState {
  return {
    fetchedValue: value,
    currentValue: value,
    previousValue: value,
    userValue: null
  }
}

function extractParameters(raw: BIMNodeRaw): Parameters {
  const result: Parameters = {}

  // Process parameters object
  if (raw.parameters && typeof raw.parameters === 'object') {
    Object.entries(raw.parameters).forEach(([key, value]) => {
      if (
        key !== '_raw' &&
        (value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean')
      ) {
        const paramKey = key.replace(/\s+/g, '_').toLowerCase()
        result[paramKey] = createParameterState(value)
      }
    })
  }

  // Process Identity Data
  if (raw['Identity Data'] && typeof raw['Identity Data'] === 'object') {
    Object.entries(raw['Identity Data'] as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          const paramKey = key.replace(/\s+/g, '_').toLowerCase()
          result[paramKey] = createParameterState(value)
        }
      }
    )
  }

  // Process Constraints
  if (raw.Constraints && typeof raw.Constraints === 'object') {
    Object.entries(raw.Constraints as Record<string, unknown>).forEach(
      ([key, value]) => {
        if (
          value === null ||
          typeof value === 'string' ||
          typeof value === 'number' ||
          typeof value === 'boolean'
        ) {
          const paramKey = key.replace(/\s+/g, '_').toLowerCase()
          result[paramKey] = createParameterState(value)
        }
      }
    )
  }

  // Process Other
  if (raw.Other && typeof raw.Other === 'object') {
    Object.entries(raw.Other as Record<string, unknown>).forEach(([key, value]) => {
      if (
        value === null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        const paramKey = key.replace(/\s+/g, '_').toLowerCase()
        result[paramKey] = createParameterState(value)
      }
    })
  }

  return result
}

function determineElementType(
  category: string,
  selectedParent: string[],
  selectedChild: string[]
): 'parent' | 'child' {
  // If no categories are selected, treat all elements as parents
  if (selectedParent.length === 0 && selectedChild.length === 0) {
    return 'parent'
  }

  // Check if element's category is in parent or child categories
  const isParentCategory = parentCategories.includes(category)
  const isChildCategory = childCategories.includes(category)

  // If element's category is in parent categories or is Uncategorized, treat as parent
  if (isParentCategory || category === 'Uncategorized') {
    return 'parent'
  }

  // If element's category is in child categories, treat as child
  if (isChildCategory) {
    return 'child'
  }

  // Default to parent for any other cases
  return 'parent'
}

function createTableRow(raw: BIMNodeRaw, isChild: boolean): TableRow {
  const category = String(raw.Other?.Category || raw.type || 'Uncategorized')
  const host = raw.Constraints?.Host
    ? String(
        typeof raw.Constraints.Host === 'object'
          ? raw.Constraints.Host.Mark || raw.Constraints.Host.id
          : raw.Constraints.Host
      )
    : undefined

  return {
    id: String(raw.id),
    mark: String(raw.Mark || raw.mark || ''),
    category,
    type: String(raw.speckleType || ''),
    host,
    parameters: extractParameters(raw),
    _visible: true,
    isChild
  }
}

function transformToTableData(
  elements: BIMNodeRaw[],
  selectedParent: string[],
  selectedChild: string[]
): TableRow[] {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting table data transformation', {
    elementCount: elements.length
  })

  // First pass: Create table rows and build parent map
  const parentMap = new Map<string, TableRow>()
  const tableData = elements.map((raw) => {
    const category = String(raw.Other?.Category || raw.type || 'Uncategorized')
    const elementType = determineElementType(category, selectedParent, selectedChild)
    const row = createTableRow(raw, elementType === 'child')

    if (elementType === 'parent' && row.mark) {
      parentMap.set(row.mark, row)
    }

    return row
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Parent map created', {
    parentCount: parentMap.size
  })

  // Second pass: Filter and link children to parents
  const filteredTableData = tableData.filter((row) => {
    if (row.isChild && row.host) {
      const parent = parentMap.get(row.host)
      if (!parent) return false
      row.host = parent.mark // Ensure host points to parent's mark
      return true
    }
    return true
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Table data transformation complete', {
    rowCount: filteredTableData.length,
    rowCategories: [...new Set(filteredTableData.map((row) => row.category))],
    sampleRow: filteredTableData[0],
    sampleParameters: Object.keys(filteredTableData[0]?.parameters || {})
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
    essentialFieldsOnly
  })

  // Step 1: Transform raw data to table rows
  const tableRows = transformToTableData(allElements, selectedParent, selectedChild)

  // Step 2: Filter elements
  const { filteredElements } = filterElements({
    allElements: tableRows,
    selectedParent,
    selectedChild,
    essentialFieldsOnly
  })

  // Step 3: Process parameters
  const { processedElements, parameterColumns, availableHeaders } = processParameters({
    filteredElements,
    essentialFieldsOnly
  })

  // Log parameter discovery results
  debug.log(DebugCategories.PARAMETERS, 'Parameter discovery complete', {
    parentParameters: {
      count: availableHeaders.parent.length,
      groups: [...new Set(availableHeaders.parent.map((h) => h.source))]
    },
    childParameters: {
      count: availableHeaders.child.length,
      groups: [...new Set(availableHeaders.child.map((h) => h.source))]
    },
    parameterColumns: parameterColumns.length
  })

  return {
    filteredElements,
    processedElements,
    tableData: processedElements,
    parameterColumns,
    availableHeaders
  }
}

/**
 * Pure function to process debug elements
 */
export function processDebugElements(elements: TableRow[]) {
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
  const parentMap = new Map<string, TableRow>()
  elements.forEach((el) => {
    if (el.mark) {
      parentMap.set(el.mark, el)
    }
  })

  const parentElements = elements.filter((el) => !el.host)
  const childElements = elements.filter((el) => !!el.host)
  const matchedElements = elements.filter((el) => {
    // Element is matched if it has a valid host
    return !!el.host && parentMap.has(el.host)
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
