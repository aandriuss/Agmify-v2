import type { ElementData, ColumnDef } from '~/composables/core/types'
import { createBimColumnDefWithDefaults } from '~/composables/core/types/tables/column-types'
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
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
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
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data pipeline', {
      elementCount: allElements.length,
      selectedParent,
      selectedChild
    })

    // Initialize result
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
    result.filteredElements = filteredElements

    // Process elements
    const { processedElements, parentColumns, childColumns } =
      processElements(filteredElements)
    result.processedElements = processedElements
    result.parentColumns = parentColumns
    result.childColumns = childColumns

    // Create table data
    result.tableData = createTableData(processedElements)
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
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Filtering elements by category')

    const filtered = elements.filter((element) => {
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
    throw err
  }
}

/**
 * Process elements to extract columns and prepare data
 */
function processElements(elements: ElementData[]): {
  processedElements: ElementData[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
} {
  try {
    debug.startState(DebugCategories.DATA_TRANSFORM, 'Processing elements')

    // Extract columns
    const parentColumns = extractColumns(elements.filter((el) => !el.isChild))
    const childColumns = extractColumns(elements.filter((el) => el.isChild))

    // Process elements with columns
    const processedElements = elements.map((element) => ({
      ...element,
      details: element.details?.map((detail) => ({
        ...detail,
        details: []
      }))
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
    throw err
  }
}

/**
 * Extract columns from elements
 */
function extractColumns(elements: ElementData[]): ColumnDef[] {
  try {
    const columns = new Map<string, ColumnDef>()

    elements.forEach((element) => {
      // Process parameters
      Object.entries(element.parameters).forEach(([key, value]) => {
        if (!columns.has(key)) {
          columns.set(
            key,
            createBimColumnDefWithDefaults({
              id: key,
              name: key,
              field: key,
              header: key,
              type:
                typeof value === 'number'
                  ? 'number'
                  : typeof value === 'boolean'
                  ? 'boolean'
                  : 'string',
              visible: true,
              removable: true,
              source: 'BIM',
              category: element.category || 'Parameters',
              sourceValue: String(value),
              fetchedGroup: 'Default',
              currentGroup: 'Default'
            })
          )
        }
      })

      // Process metadata
      if (element.metadata) {
        Object.entries(element.metadata).forEach(([key, value]) => {
          const columnKey = `metadata_${key}`
          if (!columns.has(columnKey)) {
            columns.set(
              columnKey,
              createBimColumnDefWithDefaults({
                id: columnKey,
                name: key,
                field: columnKey,
                header: key,
                type:
                  typeof value === 'number'
                    ? 'number'
                    : typeof value === 'boolean'
                    ? 'boolean'
                    : 'string',
                visible: true,
                removable: true,
                source: 'BIM',
                category: 'Metadata',
                sourceValue: String(value),
                fetchedGroup: 'Metadata',
                currentGroup: 'Metadata'
              })
            )
          }
        })
      }
    })

    return Array.from(columns.values())
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
