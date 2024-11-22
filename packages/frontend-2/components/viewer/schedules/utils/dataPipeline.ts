import type { TableRow, ElementData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { parentCategories, childCategories } from '../config/categories'
import { defaultColumns } from '../config/defaultColumns'
import { debug, DebugCategories } from './debug'
import { unref } from 'vue'

interface PipelineResult {
  filteredElements: TableRow[]
  processedElements: TableRow[]
  tableData: TableRow[]
  parameterColumns: ColumnDef[]
}

interface PipelineOptions {
  allElements: ElementData[]
  selectedParent: string[] | Ref<string[]>
  selectedChild: string[] | Ref<string[]>
}

interface DebugElementsResult {
  parentElements: TableRow[]
  childElements: TableRow[]
  matchedElements: TableRow[]
  orphanedElements: TableRow[]
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

function prepareTableData(
  elements: ElementData[],
  selectedParent: string[],
  selectedChild: string[]
): TableRow[] {
  const startStats = { elementCount: elements.length }
  debug.log(
    DebugCategories.DATA_TRANSFORM,
    'Preparing table data structure',
    startStats
  )

  // First pass: Create table rows and build parent map
  const parentMap = new Map<string, TableRow>()
  const tableData = elements
    .map((element) => {
      const elementType = determineElementType(
        element.category,
        selectedParent,
        selectedChild
      )
      const isChild = elementType === 'child'

      // Check if element matches selected categories
      const matchesSelectedCategories =
        elementType === 'parent'
          ? selectedParent.length === 0 || selectedParent.includes(element.category)
          : selectedChild.length === 0 || selectedChild.includes(element.category)

      if (!matchesSelectedCategories) {
        return null
      }

      const row: TableRow = {
        ...element,
        isChild,
        _visible: true
      }

      if (!isChild && row.mark) {
        parentMap.set(row.mark, row)
      }

      return row
    })
    .filter((row): row is TableRow => row !== null)

  // Create "Without Host" parent for orphaned children
  const withoutHostParent: TableRow = {
    id: 'without-host',
    mark: 'Without Host',
    category: 'Uncategorized',
    type: 'group',
    parameters: {},
    _visible: true,
    isChild: false,
    _raw: {}
  }

  // Second pass: Link children to parents or assign to "Without Host"
  const processedData = tableData.filter((row) => {
    if (!row.isChild) return true

    if (row.host) {
      const parent = parentMap.get(row.host)
      if (parent) {
        row.host = parent.mark
        return true
      }
      // Orphaned child - assign to "Without Host"
      row.host = withoutHostParent.mark
      return true
    }
    return false
  })

  // Add "Without Host" parent if there are orphaned children
  const hasOrphanedChildren = processedData.some(
    (row) => row.isChild && row.host === withoutHostParent.mark
  )
  if (hasOrphanedChildren) {
    processedData.unshift(withoutHostParent)
  }

  const stats = {
    inputCount: elements.length,
    outputCount: processedData.length,
    parentCount: processedData.filter((row) => !row.isChild).length,
    childCount: processedData.filter((row) => row.isChild).length,
    orphanedCount: hasOrphanedChildren
      ? processedData.filter((row) => row.host === withoutHostParent.mark).length
      : 0
  }

  debug.log(DebugCategories.DATA_TRANSFORM, 'Table data preparation complete', stats)

  return processedData
}

export function processDataPipeline({
  allElements,
  selectedParent,
  selectedChild
}: PipelineOptions): PipelineResult {
  const startStats = { elementCount: allElements.length }
  debug.log(DebugCategories.DATA, 'Processing data for table display', startStats)

  // Unwrap refs if needed
  const unwrappedParent = Array.isArray(selectedParent)
    ? selectedParent
    : unref(selectedParent)
  const unwrappedChild = Array.isArray(selectedChild)
    ? selectedChild
    : unref(selectedChild)

  // Prepare table data
  const processedData = prepareTableData(allElements, unwrappedParent, unwrappedChild)

  const stats = {
    rowCount: processedData.length,
    parentCount: processedData.filter((row) => !row.isChild).length,
    childCount: processedData.filter((row) => row.isChild).length
  }

  debug.log(DebugCategories.DATA, 'Table data processing complete', stats)

  return {
    filteredElements: processedData,
    processedElements: processedData,
    tableData: processedData,
    parameterColumns: defaultColumns
  }
}

export function processDebugElements(elements: TableRow[]): DebugElementsResult {
  if (!elements?.length) {
    return {
      parentElements: [],
      childElements: [],
      matchedElements: [],
      orphanedElements: []
    }
  }

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
    return !!el.host && parentMap.has(el.host)
  })
  const orphanedElements = elements.filter((el) => {
    return !!el.host && !parentMap.has(el.host)
  })

  return {
    parentElements,
    childElements,
    matchedElements,
    orphanedElements
  }
}
