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

interface CategorySplit {
  parents: ElementData[]
  children: ElementData[]
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

export function processDataPipeline({
  allElements,
  selectedParent,
  selectedChild
}: DataPipelineInput): DataPipelineResult {
  // Use default columns as initial active parameters
  const activeParentParameters = defaultColumns.map((col) => col.field)
  const activeChildParameters = defaultDetailColumns.map((col) => col.field)

  debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline', {
    elementCount: allElements.length,
    selectedParent,
    selectedChild,
    activeParentParams: activeParentParameters,
    activeChildParams: activeChildParameters
  })

  // Step 1: Split elements by category
  const { parents, children } = splitElementsByCategory(
    allElements,
    selectedParent,
    selectedChild
  )

  // Step 2: Process parameters and get columns
  const { processedElements, parentColumns, childColumns } = processParameters(
    parents,
    children,
    activeParentParameters,
    activeChildParameters
  )

  // Step 3: Establish relationships and convert to table data
  const tableData = establishRelationships(parents, children)

  debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data pipeline complete', {
    filteredCount: parents.length + children.length,
    processedCount: processedElements.length,
    tableDataCount: tableData.length,
    parentColumnCount: parentColumns.length,
    childColumnCount: childColumns.length
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
): CategorySplit {
  // If no categories selected, use host relationships
  if (!selectedParent.length && !selectedChild.length) {
    return elements.reduce<CategorySplit>(
      (acc, element) => {
        const elementCopy: ElementData = {
          ...element,
          details: [],
          isChild: !!element.host
        }
        if (element.host) {
          acc.children.push(elementCopy)
        } else {
          acc.parents.push(elementCopy)
        }
        return acc
      },
      { parents: [], children: [] }
    )
  }

  // Use selected categories
  return elements.reduce<CategorySplit>(
    (acc, element) => {
      const elementCopy: ElementData = {
        ...element,
        details: [],
        isChild: selectedChild.includes(element.category)
      }
      if (selectedParent.includes(element.category)) {
        acc.parents.push(elementCopy)
      } else if (selectedChild.includes(element.category)) {
        acc.children.push(elementCopy)
      }
      return acc
    },
    { parents: [], children: [] }
  )
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
  // Create columns from active parameters
  const createColumns = (parameters: string[], defaultCols: ColumnDef[]): ColumnDef[] =>
    parameters.map((name, index) => ({
      ...(defaultCols.find((col) => col.field === name) || {}),
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
      isCustomParameter: false,
      expander: index === 0
    }))

  const parentColumns = createColumns(activeParentParameters, defaultColumns)
  const childColumns = createColumns(activeChildParameters, defaultDetailColumns)

  // Process elements
  const processedElements = [...parents, ...children].map(
    (el): ElementData => ({
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
      details: el.details || []
    })
  )

  return { processedElements, parentColumns, childColumns }
}

function establishRelationships(
  parents: ElementData[],
  children: ElementData[]
): TableRow[] {
  // Create parent map with proper typing
  const parentMap = new Map<string, ElementData>(
    parents.map((parent): [string, ElementData] => [
      parent.mark,
      { ...parent, details: [] }
    ])
  )

  // Group children by host
  const childrenByHost = children.reduce((acc, child) => {
    const host = child.host || 'Ungrouped'
    if (!acc.has(host)) acc.set(host, [])
    acc.get(host)!.push({ ...child, details: [] })
    return acc
  }, new Map<string, ElementData[]>())

  // Assign children to parents
  childrenByHost.forEach((groupChildren, host) => {
    if (host === 'Ungrouped' || !parentMap.has(host)) {
      // Create ungrouped parent if needed
      if (!parentMap.has('Ungrouped')) {
        const ungroupedParent: ElementData = {
          id: 'ungrouped',
          type: 'Group',
          mark: 'Ungrouped',
          category: 'Groups',
          parameters: {},
          details: [],
          _visible: true,
          isChild: false
        }
        parentMap.set('Ungrouped', ungroupedParent)
      }
      const ungrouped = parentMap.get('Ungrouped')!
      ungrouped.details.push(...groupChildren)
    } else {
      const parent = parentMap.get(host)!
      parent.details.push(...groupChildren)
    }
  })

  // Convert to table rows with proper typing
  return Array.from(parentMap.values()).map(
    (parent): TableRow => ({
      id: parent.id,
      type: parent.type,
      mark: parent.mark,
      category: parent.category,
      parameters: parent.parameters,
      _visible: parent._visible,
      isChild: false,
      details: parent.details.map(
        (child): TableRow => ({
          id: child.id,
          type: child.type,
          mark: child.mark,
          category: child.category,
          parameters: child.parameters,
          _visible: child._visible,
          isChild: true,
          host: child.host,
          details: []
        })
      )
    })
  )
}
