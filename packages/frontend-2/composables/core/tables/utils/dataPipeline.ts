import type { ElementData } from '~/composables/core/types'
import type { TableColumn } from '~/composables/core/types/tables/table-column'
import type { RawParameter } from '~/composables/core/types/parameters/parameter-states'
import { createAvailableBimParameter } from '~/composables/core/types/parameters/parameter-states'
import { createTableColumn } from '~/composables/core/types/tables/table-column'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export interface DataPipelineOptions {
  allElements: ElementData[]
  selectedParent: string[]
  selectedChild: string[]
}

export interface DataPipelineResult {
  filteredElements: ElementData[]
  processedElements: ElementData[]
  tableData: ElementData[]
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
  isProcessingComplete: boolean
}

/**
 * Process data through the pipeline
 */
export function processDataPipeline({
  allElements,
  selectedParent,
  selectedChild
}: DataPipelineOptions): DataPipelineResult {
  try {
    // Add validation
    if (!Array.isArray(allElements)) {
      throw new Error('allElements must be an array')
    }
    if (!Array.isArray(selectedParent)) {
      throw new Error('selectedParent must be an array')
    }
    if (!Array.isArray(selectedChild)) {
      throw new Error('selectedChild must be an array')
    }

    debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline', {
      elementCount: allElements.length,
      selectedParent,
      selectedChild
    })

    // Initialize result with empty arrays
    const result: DataPipelineResult = {
      filteredElements: [],
      processedElements: [],
      tableData: [],
      parentColumns: [],
      childColumns: [],
      isProcessingComplete: false
    }

    // Filter elements by category
    const filteredElements = filterElementsByCategory(
      allElements,
      selectedParent,
      selectedChild
    )
    result.filteredElements = filteredElements || [] // Add fallback

    // Only proceed if we have filtered elements
    if (filteredElements && filteredElements.length > 0) {
      // Process elements
      const { processedElements, parentColumns, childColumns } =
        processElements(filteredElements)
      result.processedElements = processedElements || []
      result.parentColumns = parentColumns || []
      result.childColumns = childColumns || []

      // Create table data
      result.tableData = createTableData(processedElements) || []
    }

    result.isProcessingComplete = true

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Data pipeline complete', {
      filteredCount: result.filteredElements.length,
      processedCount: result.processedElements.length,
      tableDataCount: result.tableData.length,
      parentColumnCount: result.parentColumns.length,
      childColumnCount: result.childColumns.length
    })

    return result
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Data pipeline error:', err)
    throw err
  }
}

/**
 * Filter elements by category
 */
function filterElementsByCategory(
  elements: ElementData[],
  parentCategories: string[],
  childCategories: string[]
): ElementData[] {
  try {
    if (!elements || !Array.isArray(elements)) {
      return []
    }

    debug.startState(DebugCategories.DATA_TRANSFORM, 'Filtering elements by category')

    const filtered = elements.filter((element) => {
      if (!element) return false

      // Check parent category
      const isParentMatch =
        !element.isChild &&
        (parentCategories.length === 0 ||
          parentCategories.includes(element.category || 'Uncategorized'))

      // Check child category
      const isChildMatch =
        element.isChild &&
        (childCategories.length === 0 ||
          childCategories.includes(element.category || 'Uncategorized'))

      return isParentMatch || isChildMatch
    })

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Elements filtered', {
      totalCount: elements.length,
      filteredCount: filtered.length
    })

    return filtered
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error filtering elements:', err)
    return []
  }
}

/**
 * Process elements to extract columns and prepare data
 */
function processElements(elements: ElementData[]): {
  processedElements: ElementData[]
  parentColumns: TableColumn[]
  childColumns: TableColumn[]
} {
  try {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing elements')

    if (!Array.isArray(elements)) {
      debug.warn(DebugCategories.DATA_TRANSFORM, 'Invalid elements array')
      return {
        processedElements: [],
        parentColumns: [],
        childColumns: []
      }
    }

    // Extract columns with null checks
    const parentElements = elements.filter((el) => el && !el.isChild)
    const childElements = elements.filter((el) => el && el.isChild)

    const parentColumns = extractColumns(parentElements)
    const childColumns = extractColumns(childElements)

    // Process elements with columns
    const processedElements = elements.map((element) => ({
      ...element,
      details:
        element.details?.map((detail) => ({
          ...detail,
          details: []
        })) ?? []
    }))

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Elements processed', {
      elementCount: processedElements.length,
      parentColumnCount: parentColumns.length,
      childColumnCount: childColumns.length
    })

    return {
      processedElements,
      parentColumns,
      childColumns
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error processing elements:', err)
    return {
      processedElements: [],
      parentColumns: [],
      childColumns: []
    }
  }
}

/**
 * Extract columns from elements following the new parameter flow
 */
function extractColumns(elements: ElementData[]): TableColumn[] {
  try {
    const parameterMap = new Map<string, TableColumn>()
    let order = 0

    elements.forEach((element) => {
      // Process parameters if they exist
      if (element.parameters) {
        Object.entries(element.parameters).forEach(([key, value]) => {
          if (!parameterMap.has(key)) {
            // Determine parameter type and value
            let paramType: 'number' | 'boolean' | 'string'
            let paramValue: number | boolean | string

            if (typeof value === 'number') {
              paramType = 'number'
              paramValue = value
            } else if (typeof value === 'boolean') {
              paramType = 'boolean'
              paramValue = value
            } else {
              paramType = 'string'
              paramValue = String(value)
            }

            const rawParam: RawParameter = {
              id: key,
              name: key,
              value: paramValue,
              fetchedGroup: 'Parameters',
              metadata: {
                category: element.category || 'Parameters'
              }
            }

            // Convert to available parameter with properly typed value
            const availableParam = createAvailableBimParameter(
              rawParam,
              paramType,
              paramValue,
              false
            )

            // Convert directly to column
            const column = createTableColumn(availableParam, order++)
            parameterMap.set(key, column)
          }
        })
      }

      // Process metadata if it exists
      if (element.metadata) {
        Object.entries(element.metadata).forEach(([key, value]) => {
          const columnKey = `metadata_${key}`
          if (!parameterMap.has(columnKey)) {
            // Determine metadata type and value
            let paramType: 'number' | 'boolean' | 'string'
            let paramValue: number | boolean | string

            if (typeof value === 'number') {
              paramType = 'number'
              paramValue = value
            } else if (typeof value === 'boolean') {
              paramType = 'boolean'
              paramValue = value
            } else {
              paramType = 'string'
              paramValue = String(value)
            }

            // Create raw parameter for metadata with properly typed value
            const rawParam: RawParameter = {
              id: columnKey,
              name: key,
              value: paramValue,
              fetchedGroup: 'Metadata',
              metadata: {
                category: 'Metadata'
              }
            }

            // Convert to available parameter with properly typed value
            const availableParam = createAvailableBimParameter(
              rawParam,
              paramType,
              paramValue,
              false
            )

            // Convert directly to column
            const column = createTableColumn(availableParam, order++)
            parameterMap.set(columnKey, column)
          }
        })
      }
    })

    return Array.from(parameterMap.values())
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error extracting columns:', err)
    throw err
  }
}

/**
 * Create table data from processed elements
 */
function createTableData(elements: ElementData[]): ElementData[] {
  try {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Creating table data')

    const tableData = elements
      .filter((el) => !el.isChild)
      .map((parent) => ({
        ...parent,
        details: parent.details?.map((child) => ({
          ...child,
          details: []
        }))
      }))

    debug.completeState(DebugCategories.DATA_TRANSFORM, 'Table data created', {
      rowCount: tableData.length
    })

    return tableData
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Error creating table data:', err)
    throw err
  }
}
