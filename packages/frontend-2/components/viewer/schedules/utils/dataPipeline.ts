import type {
  ElementData,
  TableRow,
  ParameterValue,
  ParameterValueState,
  ColumnDef
} from '~/composables/core/types'
import { createElementData } from '~/composables/core/types'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import {
  createColumnsFromParameters,
  mergeColumns
} from '~/composables/core/utils/columnUtils'
import { convertToParameterValue } from '~/composables/core/parameters/utils/parameter-conversion'

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

/**
 * Type guard for Record<string, unknown>
 */
function isRecordStringUnknown(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

interface ParameterStats {
  raw: number
  unique: Set<string>
  groups: Map<string, Set<string>>
  activeGroups: Map<string, Set<string>>
}

function initParameterStats(): ParameterStats {
  return {
    raw: 0,
    unique: new Set(),
    groups: new Map(),
    activeGroups: new Map()
  }
}

function updateParameterStats(
  stats: ParameterStats,
  key: string,
  _value: unknown // Prefix with _ to indicate unused
): void {
  stats.raw++
  stats.unique.add(key)

  // Handle parameter grouping
  const parts = key.split('.')
  if (parts.length > 1) {
    const group = parts[0]
    const param = parts[parts.length - 1]
    if (!stats.groups.has(group)) {
      stats.groups.set(group, new Set())
      stats.activeGroups.set(group, new Set())
    }
    stats.groups.get(group)!.add(param)
    // Mark as active if not a system parameter (like __closure)
    if (!key.startsWith('__')) {
      stats.activeGroups.get(group)!.add(param)
    }
  } else {
    if (!stats.groups.has('Parameters')) {
      stats.groups.set('Parameters', new Set())
      stats.activeGroups.set('Parameters', new Set())
    }
    stats.groups.get('Parameters')!.add(key)
    // Mark as active if not a system parameter
    if (!key.startsWith('__')) {
      stats.activeGroups.get('Parameters')!.add(key)
    }
  }
}

function processParameterObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, ParameterValue> = {},
  stats?: ParameterStats
): Record<string, ParameterValue> {
  Object.entries(obj).forEach(([key, value]) => {
    // Skip system parameters
    if (key.startsWith('__')) return

    // Handle special cases like Pset_BuildingCommon
    if (key.startsWith('Pset_') && typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown
        if (isRecordStringUnknown(parsed)) {
          // Use the Pset name as the group prefix
          processParameterObject(parsed, key, result, stats)
          return
        }
      } catch (e) {
        // If parsing fails, treat as normal value
        const converted = convertToParameterValue(value)
        result[key] = converted
        if (stats) {
          updateParameterStats(stats, key, converted)
        }
      }
      return
    }

    // Handle Identity Data and Dimensions groups
    const isIdentityData = key === 'Identity Data' || prefix === 'Identity Data'
    const isDimensions = key === 'Dimensions' || prefix === 'Dimensions'

    if ((isIdentityData || isDimensions) && isRecordStringUnknown(value)) {
      // Process nested parameters with proper group prefix
      const groupPrefix = isIdentityData ? 'Identity Data' : 'Dimensions'
      processParameterObject(
        value as Record<string, unknown>,
        groupPrefix,
        result,
        stats
      )
      return
    }

    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value !== null && value !== undefined) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        if (isRecordStringUnknown(value)) {
          // Recursively process nested objects
          processParameterObject(value, fullKey, result, stats)
        } else {
          // Handle non-record objects
          const converted = convertToParameterValue(value)
          result[fullKey] = converted
          if (stats) {
            updateParameterStats(stats, fullKey, converted)
          }
        }
      } else {
        // Convert value and store with full key path
        const converted = convertToParameterValue(value)
        result[fullKey] = converted
        if (stats) {
          updateParameterStats(stats, fullKey, converted)
        }
      }
    } else {
      // Handle null/undefined values
      result[fullKey] = null
      if (stats) {
        updateParameterStats(stats, fullKey, null)
      }
    }
  })

  return result
}

function processParameters(
  rawParameters: Record<string, unknown>
): Record<string, ParameterValue> {
  // First flatten and group parameters
  const flattenedParams = processParameterObject(rawParameters)

  // Then create parameter states
  const parameterStates = Object.fromEntries(
    Object.entries(flattenedParams).map(([key, value]) => [
      key,
      isParameterValueState(value)
        ? value
        : createParameterState(value as ParameterValue)
    ])
  )

  // Finally extract current values while preserving structure
  return Object.fromEntries(
    Object.entries(parameterStates).map(([key, state]) => [key, state.currentValue])
  )
}

export async function processDataPipeline(
  input: DataPipelineInput
): Promise<DataPipelineResult> {
  debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline')

  // Step 1: Quick initial processing
  const quickResult = processQuickPass(input)

  // Return quick result immediately
  return Promise.resolve({
    ...quickResult,
    isProcessingComplete: false
  }).then(async () => {
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
  })
}

/**
 * Extract all parameters including nested ones
 */
function extractAllParameters(elements: ElementData[]): string[] {
  const parameterSet = new Set<string>()
  const stats = initParameterStats()

  elements.forEach((element) => {
    if (element.parameters) {
      // Process all parameters including nested ones
      const processedParams = processParameterObject(element.parameters, '', {}, stats)
      Object.keys(processedParams).forEach((key) => parameterSet.add(key))
    }
  })

  // Log parameter stats with detailed group information
  debug.log(DebugCategories.DATA_TRANSFORM, 'Parameter stats', {
    elementCount: elements.length,
    raw: stats.raw,
    unique: stats.unique.size,
    groups: Object.fromEntries(
      Array.from(stats.groups.entries()).map(([group, params]) => [
        group,
        {
          total: params.size,
          active: stats.activeGroups.get(group)?.size || 0,
          parameters: Array.from(params),
          activeParameters: Array.from(stats.activeGroups.get(group) || new Set())
        }
      ])
    ),
    sampleParameters: Array.from(parameterSet).slice(0, 10),
    categories: {
      parent: Array.from(new Set(elements.map((el) => el.category))),
      child: Array.from(
        new Set(elements.filter((el) => el.isChild).map((el) => el.category))
      )
    }
  })

  return Array.from(parameterSet)
}

// [Previous processQuickPass implementation]

function processQuickPass(
  input: DataPipelineInput
): Omit<DataPipelineResult, 'isProcessingComplete'> {
  const { allElements, selectedParent, selectedChild } = input

  debug.log(DebugCategories.DATA_TRANSFORM, 'Quick pass processing', {
    elementCount: allElements.length,
    selectedParent,
    selectedChild
  })

  // Step 1: Split elements by category
  const { parents, children } = splitElementsByCategory(
    allElements,
    selectedParent,
    selectedChild
  )

  // Step 2: Extract all parameters
  const parentParameters = extractAllParameters(parents)
  const childParameters = extractAllParameters(children)

  debug.log(DebugCategories.DATA_TRANSFORM, 'Parameters extracted', {
    parentCount: parents.length,
    childCount: children.length,
    parentParameterCount: parentParameters.length,
    childParameterCount: childParameters.length,
    parentSample: parentParameters.slice(0, 5),
    childSample: childParameters.slice(0, 5),
    categories: {
      parent: Array.from(new Set(parents.map((p) => p.category))),
      child: Array.from(new Set(children.map((c) => c.category)))
    }
  })

  // Step 3: Create columns from parameters, merging with defaults
  const parentColumns = createColumnsFromParameters(
    [...parentParameters, ...defaultColumns.map((col) => col.field)],
    defaultColumns
  )
  const childColumns = createColumnsFromParameters(
    [...childParameters, ...defaultDetailColumns.map((col) => col.field)],
    defaultDetailColumns
  )

  // Step 4: Process elements
  const processedElements = [...parents, ...children].map((el) => {
    return createElementData({
      ...el,
      id: el.id,
      type: el.type,
      mark: el.mark || el.id,
      name: el.name,
      field: el.field,
      header: el.header,
      visible: el.visible,
      removable: el.removable,
      category: el.category || 'Uncategorized',
      parameters: processParameters(el.parameters || {}),
      details: []
    })
  })

  // Step 5: Establish relationships
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
  const processedElements = filteredElements.map((el) => {
    return createElementData({
      ...el,
      id: el.id,
      type: el.type,
      parameters: processParameters(el.parameters || {}),
      details: el.details || []
    })
  })

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
        const elementCopy = createElementData({
          ...element,
          id: element.id,
          type: element.type,
          parameters: { ...element.parameters },
          details: [],
          isChild: !!element.host
        })
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
      const elementCopy = createElementData({
        ...element,
        id: element.id,
        type: element.type,
        parameters: { ...element.parameters },
        details: [],
        isChild: selectedChild.includes(element.category || '')
      })
      if (selectedParent.includes(element.category || '')) {
        acc.parents.push(elementCopy)
      } else if (selectedChild.includes(element.category || '')) {
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
      parent.mark || parent.id,
      createElementData({
        ...parent,
        id: parent.id,
        type: parent.type,
        parameters: { ...parent.parameters },
        details: []
      })
    ])
  )

  // Basic child assignment
  children.forEach((child) => {
    const host = child.host || 'Ungrouped'
    const parent = parentMap.get(host) || parentMap.get('Ungrouped')
    if (parent) {
      parent.details = parent.details || []
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
      parent.mark || parent.id,
      createElementData({
        ...parent,
        id: parent.id,
        type: parent.type,
        parameters: { ...parent.parameters },
        details: []
      })
    ])
  )

  // Group children by host
  const childrenByHost = children.reduce((acc, child) => {
    const host = child.host || 'Ungrouped'
    if (!acc.has(host)) acc.set(host, [])
    const group = acc.get(host)!
    group.push(
      createElementData({
        ...child,
        id: child.id,
        type: child.type,
        parameters: { ...child.parameters },
        details: []
      })
    )
    return acc
  }, new Map<string, ElementData[]>())

  // Assign children to parents
  childrenByHost.forEach((groupChildren, host) => {
    if (host === 'Ungrouped' || !parentMap.has(host)) {
      // Create ungrouped parent if needed
      if (!parentMap.has('Ungrouped')) {
        const ungroupedParent = createElementData({
          id: 'ungrouped',
          type: 'Group',
          name: 'Ungrouped',
          field: 'ungrouped',
          header: 'Ungrouped',
          visible: true,
          removable: false,
          mark: 'Ungrouped',
          category: 'Groups',
          parameters: {},
          details: [],
          _visible: true,
          isChild: false
        })
        parentMap.set('Ungrouped', ungroupedParent)
      }
      const ungrouped = parentMap.get('Ungrouped')!
      ungrouped.details = ungrouped.details || []
      ungrouped.details.push(...groupChildren)
    } else {
      const parent = parentMap.get(host)!
      parent.details = parent.details || []
      parent.details.push(...groupChildren)
    }
  })

  return Array.from(parentMap.values()).map(elementToTableRow)
}

function elementToTableRow(element: ElementData): TableRow {
  return {
    id: element.id,
    name: element.name,
    field: element.field,
    header: element.header,
    removable: element.removable,
    type: element.type || '',
    mark: element.mark || element.id,
    category: element.category || '',
    parameters: element.parameters,
    _visible: element._visible ?? true,
    isChild: element.isChild ?? false,
    host: element.host,
    _raw: element._raw,
    details: element.details?.map(elementToTableRow) || [],
    order: element.order
  }
}
