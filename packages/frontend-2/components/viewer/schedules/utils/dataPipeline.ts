import type {
  ElementData,
  TableRow,
  ParameterValue,
  ParameterValueState,
  Parameters,
  ColumnDef
} from '~/composables/core/types'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import { createColumnsFromParameters, mergeColumns } from './columnUtils'

const debug = useDebug()

interface DataPipelineResult {
  filteredElements: ElementData[]
  processedElements: ElementData[]
  tableData: TableRow[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  isProcessingComplete: boolean
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

export async function processDataPipeline(
  input: DataPipelineInput
): Promise<DataPipelineResult> {
  debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline')

  // Step 1: Quick initial processing
  const quickResult = processQuickPass(input)

  // Return quick result through Promise.resolve to maintain async contract
  // but allow immediate access to initial data
  Promise.resolve({
    ...quickResult,
    isProcessingComplete: false
  })

  // Step 2: Schedule full processing
  const fullResult = await new Promise<DataPipelineResult>((resolve) => {
    queueMicrotask(() => {
      const result = processFullPass(quickResult)
      debug.completeState(
        DebugCategories.DATA_TRANSFORM,
        'Full data processing complete',
        {
          elementCount: input.allElements.length,
          filteredCount: result.filteredElements.length,
          processedCount: result.processedElements.length,
          tableDataCount: result.tableData.length
        }
      )
      resolve({
        ...result,
        isProcessingComplete: true
      })
    })
  })

  return fullResult
}

function processQuickPass(
  input: DataPipelineInput
): Omit<DataPipelineResult, 'isProcessingComplete'> {
  const { allElements, selectedParent, selectedChild } = input

  debug.log(DebugCategories.DATA_TRANSFORM, 'Quick pass processing', {
    elementCount: allElements.length,
    selectedParent,
    selectedChild
  })

  // Step 1: Split elements by category (basic)
  const { parents, children } = splitElementsByCategory(
    allElements,
    selectedParent,
    selectedChild
  )

  // Step 2: Basic parameter processing
  const activeParentParameters = defaultColumns.map((col) => col.field)
  const activeChildParameters = defaultDetailColumns.map((col) => col.field)

  const parentColumns = createColumnsFromParameters(
    activeParentParameters,
    defaultColumns
  )
  const childColumns = createColumnsFromParameters(
    activeChildParameters,
    defaultDetailColumns
  )

  // Step 3: Basic element processing
  const processedElements = [...parents, ...children].map(
    (el): ElementData => ({
      ...el,
      mark: el.mark || el.id,
      category: el.category || 'Uncategorized',
      parameters: {},
      details: []
    })
  )

  // Step 4: Basic relationship establishment
  const tableData = establishBasicRelationships(parents, children)

  return {
    filteredElements: [...parents, ...children],
    processedElements,
    tableData,
    parentColumns,
    childColumns
  }
}

function processFullPass(
  quickResult: Omit<DataPipelineResult, 'isProcessingComplete'>
): Omit<DataPipelineResult, 'isProcessingComplete'> {
  const {
    filteredElements,
    parentColumns: baseParentCols,
    childColumns: baseChildCols
  } = quickResult

  debug.log(DebugCategories.DATA_TRANSFORM, 'Full pass processing', {
    elementCount: filteredElements.length
  })

  // Step 1: Full parameter processing
  const processedElements = filteredElements.map(
    (el): ElementData => ({
      ...el,
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

  // Step 2: Full column processing
  const parentColumns = mergeColumns(baseParentCols, defaultColumns)
  const childColumns = mergeColumns(baseChildCols, defaultDetailColumns)

  // Step 3: Full relationship establishment
  const parents = processedElements.filter((el) => !el.isChild)
  const children = processedElements.filter((el) => el.isChild)
  const tableData = establishFullRelationships(parents, children)

  return {
    filteredElements,
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

function establishBasicRelationships(
  parents: ElementData[],
  children: ElementData[]
): TableRow[] {
  const parentMap = new Map<string, ElementData>(
    parents.map((parent): [string, ElementData] => [
      parent.mark,
      { ...parent, details: [] }
    ])
  )

  // Basic child assignment
  children.forEach((child) => {
    const host = child.host || 'Ungrouped'
    const parent = parentMap.get(host) || parentMap.get('Ungrouped')
    if (parent) {
      parent.details.push(child)
    }
  })

  return Array.from(parentMap.values()).map(elementToTableRow)
}

function establishFullRelationships(
  parents: ElementData[],
  children: ElementData[]
): TableRow[] {
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

  return Array.from(parentMap.values()).map(elementToTableRow)
}

function elementToTableRow(element: ElementData): TableRow {
  return {
    id: element.id,
    type: element.type || '',
    mark: element.mark,
    category: element.category,
    parameters: element.parameters,
    _visible: element._visible ?? true,
    isChild: element.isChild ?? false,
    host: element.host,
    _raw: element._raw,
    details: element.details?.map(elementToTableRow) || []
  }
}
