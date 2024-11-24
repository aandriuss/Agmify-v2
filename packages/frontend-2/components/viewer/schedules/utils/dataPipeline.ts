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
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
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
  // Keep parent and child parameters separate from the start
  const activeParentParameters = defaultColumns.map((col) => col.field)
  const activeChildParameters = defaultDetailColumns.map((col) => col.field)

  debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline', {
    elementCount: allElements.length,
    selectedParent,
    selectedChild,
    parentParameters: activeParentParameters,
    childParameters: activeChildParameters
  })

  // Step 1: Split elements into parents and children based on selected categories
  const { parents, children } = splitElementsByCategory(
    allElements,
    selectedParent,
    selectedChild
  )

  debug.log(DebugCategories.DATA_TRANSFORM, 'Split elements', {
    totalElements: allElements.length,
    parentCount: parents.length,
    childCount: children.length,
    selectedParent,
    selectedChild,
    // Add sample data to verify content
    sampleParent: parents[0]
      ? {
          id: parents[0].id,
          mark: parents[0].mark,
          category: parents[0].category
        }
      : null,
    sampleChild: children[0]
      ? {
          id: children[0].id,
          mark: children[0].mark,
          category: children[0].category,
          host: children[0].host
        }
      : null
  })

  // Step 2: Process parameters and get columns
  const { processedElements, parentColumns, childColumns } = processParameters(
    parents,
    children,
    activeParentParameters,
    activeChildParameters
  )

  // Step 3: Establish parent-child relationships
  const organizedElements = establishRelationships(parents, children)

  // Add detailed logging for organized elements
  debug.log(DebugCategories.DATA_TRANSFORM, 'Organized elements details', {
    totalOrganized: organizedElements.length,
    elementDetails: organizedElements.map((el) => ({
      id: el.id,
      mark: el.mark,
      category: el.category,
      childCount: el.details?.length || 0,
      children: el.details?.map((child) => ({
        id: child.id,
        mark: child.mark,
        category: child.category,
        host: child.host
      }))
    }))
  })

  // Step 4: Convert to table data
  const tableData = convertToTableData(organizedElements)

  // Add detailed logging for table data
  debug.log(DebugCategories.DATA_TRANSFORM, 'Table data details', {
    totalRows: tableData.length,
    rowDetails: tableData.map((row) => ({
      id: row.id,
      mark: row.mark,
      category: row.category,
      isChild: row.isChild,
      childCount: row.details?.length || 0,
      children: row.details?.map((child) => ({
        id: child.id,
        mark: child.mark,
        category: child.category,
        host: child.host
      }))
    }))
  })

  debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data pipeline complete', {
    filteredCount: parents.length + children.length,
    processedCount: processedElements.length,
    parentColumnCount: parentColumns.length,
    childColumnCount: childColumns.length,
    parentCount: tableData.filter((row) => !row.isChild).length,
    childCount: tableData.filter((row) => row.isChild).length,
    withDetails: tableData.filter((row) => row.details && row.details.length > 0)
      .length,
    // Add more detailed counts
    byCategory: {
      parents: tableData
        .filter((row) => !row.isChild)
        .reduce((acc, row) => {
          acc[row.category] = (acc[row.category] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      children: tableData
        .filter((row) => row.isChild)
        .reduce((acc, row) => {
          acc[row.category] = (acc[row.category] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      details: tableData.reduce((acc, row) => {
        if (row.details?.length) {
          acc[row.category] = (acc[row.category] || 0) + row.details.length
        }
        return acc
      }, {} as Record<string, number>)
    }
  })

  return {
    filteredElements: [...parents, ...children],
    processedElements,
    tableData,
    parentColumns,
    childColumns
  }
}

function splitElementsByCategory(
  elements: ElementData[],
  selectedParent: string[],
  selectedChild: string[]
): { parents: ElementData[]; children: ElementData[] } {
  // If no categories selected, treat all elements as parents
  if (!selectedParent.length && !selectedChild.length) {
    return {
      parents: elements.map((el) => ({ ...el, isChild: false, details: [] })),
      children: []
    }
  }

  const parents: ElementData[] = []
  const children: ElementData[] = []

  // Split elements based on selected categories
  elements.forEach((element) => {
    const elementCopy = { ...element, details: [] }

    // If element's category is in parent categories, it's a parent
    if (selectedParent.includes(element.category)) {
      elementCopy.isChild = false
      parents.push(elementCopy)
    }
    // If element's category is in child categories, it's a child
    else if (selectedChild.includes(element.category)) {
      elementCopy.isChild = true
      children.push(elementCopy)
    }
  })

  debug.log(DebugCategories.CATEGORIES, 'Split elements by category', {
    totalElements: elements.length,
    parentCount: parents.length,
    childCount: children.length,
    selectedParent,
    selectedChild
  })

  return { parents, children }
}

function processParameters(
  parents: ElementData[],
  children: ElementData[],
  activeParentParameters: string[],
  activeChildParameters: string[]
): {
  processedElements: ElementData[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
} {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Processing parameters', {
    activeParentCount: activeParentParameters.length,
    activeChildCount: activeChildParameters.length,
    parentFields: activeParentParameters,
    childFields: activeChildParameters
  })

  // Create parent columns for active parameters
  const parentColumns: ColumnDef[] = activeParentParameters.map((name, index) => {
    const defaultColumn = defaultColumns.find((col) => col.field === name)
    const baseColumn = {
      ...(defaultColumn || {}),
      field: name,
      header: name,
      type: 'parameter',
      sortable: true,
      visible: true,
      source: 'Parameters',
      order: index,
      category: 'Parameters',
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters',
      isFetched: true,
      description: `Parameter ${name}`,
      isFixed: false,
      isCustomParameter: false
    }
    // Add expander to first column
    if (index === 0) {
      return { ...baseColumn, expander: true }
    }
    return baseColumn
  })

  // Create child columns for active parameters
  const childColumns: ColumnDef[] = activeChildParameters.map((name, index) => {
    const defaultColumn = defaultDetailColumns.find((col) => col.field === name)
    const baseColumn = {
      ...(defaultColumn || {}),
      field: name,
      header: name,
      type: 'parameter',
      sortable: true,
      visible: true,
      source: 'Parameters',
      order: index,
      category: 'Parameters',
      fetchedGroup: 'Parameters',
      currentGroup: 'Parameters',
      isFetched: true,
      description: `Parameter ${name}`,
      isFixed: false,
      isCustomParameter: false
    }
    // Add expander to first column to support future grandchildren
    if (index === 0) {
      return { ...baseColumn, expander: true }
    }
    return baseColumn
  })

  // Process elements
  const processedElements = [...parents, ...children].map((el) => ({
    ...el,
    mark: el.mark || el.id,
    category: el.category || 'Uncategorized',
    parameters: Object.fromEntries(
      Object.entries(el.parameters || {}).map(([key, value]) => [
        key,
        isParameterValueState(value)
          ? value
          : createParameterState(value as ParameterValue)
      ])
    ) as Parameters,
    details: el.details || [] // Ensure details array exists
  }))

  debug.log(DebugCategories.DATA_TRANSFORM, 'Parameters processed', {
    parentColumnCount: parentColumns.length,
    childColumnCount: childColumns.length,
    parentColumns: parentColumns.map((c) => ({
      field: c.field,
      expander: c.expander,
      order: c.order
    })),
    childColumns: childColumns.map((c) => ({
      field: c.field,
      expander: c.expander,
      order: c.order
    }))
  })

  return {
    processedElements,
    parentColumns,
    childColumns
  }
}

function establishRelationships(
  parents: ElementData[],
  children: ElementData[]
): ElementData[] {
  debug.log(DebugCategories.DATA_TRANSFORM, 'Starting relationship establishment', {
    parentCount: parents.length,
    childCount: children.length,
    parentMarks: parents.map((p) => p.mark),
    childHosts: children.map((c) => c.host)
  })

  // Create a map of mark to parent element for quick lookups
  const markToParent = new Map<string, ElementData>()
  parents.forEach((parent) => {
    if (parent.mark) {
      markToParent.set(parent.mark, { ...parent, details: [] })
      debug.log(DebugCategories.DATA_TRANSFORM, 'Added parent to map', {
        mark: parent.mark,
        id: parent.id,
        category: parent.category
      })
    }
  })

  // Track children that couldn't be matched to a parent
  const ungroupedChildren: ElementData[] = []

  // Match children to parents based on host parameter
  children.forEach((child) => {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Processing child', {
      id: child.id,
      mark: child.mark,
      host: child.host,
      category: child.category,
      hasMatchingParent: child.host ? markToParent.has(child.host) : false
    })

    if (child.host && markToParent.has(child.host)) {
      const parent = markToParent.get(child.host)!
      if (!parent.details) parent.details = []
      parent.details.push({ ...child, details: [] })
      debug.log(DebugCategories.DATA_TRANSFORM, 'Added child to parent', {
        childId: child.id,
        childMark: child.mark,
        parentMark: parent.mark,
        parentDetailsCount: parent.details.length
      })
    } else {
      ungroupedChildren.push({ ...child, details: [] })
      debug.log(DebugCategories.DATA_TRANSFORM, 'Added child to ungrouped', {
        childId: child.id,
        childMark: child.mark,
        childHost: child.host
      })
    }
  })

  // Get all parents with their matched children
  const organizedElements = Array.from(markToParent.values())

  // If we have ungrouped children, create an "Ungrouped" parent
  if (ungroupedChildren.length > 0) {
    organizedElements.push({
      id: 'ungrouped',
      type: 'Group',
      mark: 'Ungrouped',
      category: 'Groups',
      parameters: {},
      details: ungroupedChildren,
      _visible: true,
      isChild: false
    })
  }

  debug.log(DebugCategories.DATA_TRANSFORM, 'Relationships established', {
    totalParents: parents.length,
    totalChildren: children.length,
    parentsWithChildren: organizedElements.filter((el) => el.details?.length > 0)
      .length,
    orphanedChildren: ungroupedChildren.length,
    organizedElements: organizedElements.map((el) => ({
      mark: el.mark,
      childCount: el.details?.length || 0,
      children: el.details?.map((c) => ({ mark: c.mark, host: c.host }))
    }))
  })

  return organizedElements
}

function convertToTableData(elements: ElementData[]): TableRow[] {
  return elements.map((el): TableRow => {
    // Process parameters for the element
    const processedParameters = Object.fromEntries(
      Object.entries(el.parameters || {}).map(([key, value]) => [
        key,
        isParameterValueState(value)
          ? value
          : createParameterState(value as ParameterValue)
      ])
    ) as Parameters

    // Create base row
    const row: TableRow = {
      id: el.id,
      type: el.type,
      mark: el.mark,
      category: el.category,
      parameters: processedParameters,
      _visible: true,
      isChild: el.isChild,
      host: el.host,
      details: [] // Initialize details array
    }

    // If element has details (children), process them recursively to support grandchildren
    if (el.details && el.details.length > 0) {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Processing element details', {
        parentId: el.id,
        parentMark: el.mark,
        childCount: el.details.length,
        children: el.details.map((child) => ({
          id: child.id,
          mark: child.mark,
          host: child.host,
          parameterCount: Object.keys(child.parameters || {}).length,
          hasGrandchildren: child.details?.length > 0
        }))
      })

      // Process child elements recursively
      row.details = el.details.map((child): TableRow => {
        // Process parameters for the child
        const childParameters = Object.fromEntries(
          Object.entries(child.parameters || {}).map(([key, value]) => [
            key,
            isParameterValueState(value)
              ? value
              : createParameterState(value as ParameterValue)
          ])
        ) as Parameters

        // Create child row with potential grandchildren
        const childRow: TableRow = {
          id: child.id,
          type: child.type,
          mark: child.mark,
          category: child.category,
          parameters: childParameters,
          _visible: child._visible ?? true,
          _raw: child._raw,
          isChild: true,
          host: child.host,
          details: [] // Initialize details array for potential grandchildren
        }

        // Process grandchildren if they exist
        if (child.details && child.details.length > 0) {
          childRow.details = convertToTableData(child.details)
          debug.log(DebugCategories.DATA_TRANSFORM, 'Processed grandchildren', {
            childId: child.id,
            childMark: child.mark,
            grandchildCount: childRow.details.length
          })
        }

        return childRow
      })

      // Log processed details
      debug.log(DebugCategories.DATA_TRANSFORM, 'Processed child details', {
        parentId: el.id,
        parentMark: el.mark,
        processedChildren: row.details.map((child) => ({
          id: child.id,
          mark: child.mark,
          parameterCount: Object.keys(child.parameters || {}).length,
          grandchildCount: child.details?.length || 0
        }))
      })
    }

    return row
  })
}
