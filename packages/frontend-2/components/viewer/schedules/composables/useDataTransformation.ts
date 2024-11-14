import { debug, DebugCategories } from '../utils/debug'
import type { ComputedRef } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { convertToString } from '../utils/dataConversion'

interface DataTransformationOptions {
  state: {
    scheduleData: ElementData[]
    evaluatedData: ElementData[]
    tableData: TableRowData[]
    customParameters: CustomParameter[]
    mergedTableColumns: ColumnDef[]
    mergedDetailColumns: ColumnDef[]
  }
  selectedParentCategories: ComputedRef<string[]>
  selectedChildCategories: ComputedRef<string[]>
  updateTableData: (data: TableRowData[]) => void
  updateEvaluatedData: (data: ElementData[]) => void
  handleError: (error: Error) => void
}

export function useDataTransformation(options: DataTransformationOptions) {
  const {
    state,
    updateTableData,
    updateEvaluatedData,
    handleError,
    selectedParentCategories,
    selectedChildCategories
  } = options

  function evaluateCustomParameters(element: ElementData): ElementData {
    const evaluatedElement = { ...element }

    state.customParameters.forEach((param) => {
      if (!param.visible) return

      try {
        if (param.type === 'fixed') {
          evaluatedElement[param.field] = convertToString(param.value)
        } else if (param.type === 'equation' && param.equation) {
          // Here you would evaluate the equation using the element's data
          // This is a placeholder for equation evaluation logic
          evaluatedElement[param.field] = 'Equation result'
        }
      } catch (err) {
        debug.warn(DebugCategories.DATA_TRANSFORM, 'Failed to evaluate parameter', {
          parameter: param,
          element,
          error: err
        })
      }
    })

    return evaluatedElement
  }

  function filterAndOrganizeData(data: ElementData[]): ElementData[] {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Filtering and organizing data', {
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value,
      inputDataCount: data.length
    })

    // Step 1: Filter elements by selected categories
    const filteredElements = data.filter((element) => {
      const isParentCategory =
        selectedParentCategories.value.length === 0 ||
        selectedParentCategories.value.includes(element.category)
      const isChildCategory =
        selectedChildCategories.value.length === 0 ||
        selectedChildCategories.value.includes(element.category)
      return isParentCategory || isChildCategory
    })

    // Step 2: Separate parents and children based on selected categories
    const parents = filteredElements.filter(
      (element) =>
        selectedParentCategories.value.length === 0 ||
        selectedParentCategories.value.includes(element.category)
    )

    const children = filteredElements.filter(
      (element) =>
        selectedChildCategories.value.length === 0 ||
        selectedChildCategories.value.includes(element.category)
    )

    // Step 3: Create a map of parent marks for quick lookup
    const parentMarkMap = new Map<string, ElementData>()
    parents.forEach((parent) => {
      if (parent.mark) {
        parentMarkMap.set(parent.mark, parent)
      }
    })

    // Step 4: Organize children under their parents
    const organizedParents = parents.map((parent) => ({
      ...parent,
      details: children.filter((child) => child.host === parent.mark)
    }))

    // Step 5: Collect orphaned children (those without matching parents)
    const orphanedChildren = children.filter(
      (child) => !child.host || !parentMarkMap.has(child.host)
    )

    // Step 6: If there are orphaned children, create an "Ungrouped" parent
    if (orphanedChildren.length > 0) {
      organizedParents.push({
        id: 'ungrouped',
        mark: 'Ungrouped',
        category: 'Ungrouped',
        type: 'Ungrouped',
        details: orphanedChildren,
        _visible: true
      })
    }

    debug.log(DebugCategories.DATA_TRANSFORM, 'Data organization complete', {
      totalParents: organizedParents.length,
      totalChildren: children.length,
      orphanedChildren: orphanedChildren.length,
      firstParent: organizedParents[0],
      firstChild: children[0]
    })

    return organizedParents
  }

  function transformToTableRows(data: ElementData[]): TableRowData[] {
    return data.map((element) => {
      const row: TableRowData = {
        ...element,
        _visible: true,
        details: element.details?.map((detail) => ({
          ...detail,
          _visible: true
        }))
      }

      // Add custom parameter values
      state.customParameters.forEach((param) => {
        if (param.visible) {
          if (row[param.field] === undefined) {
            row[param.field] = null
          } else {
            // Convert existing values to string using our centralized utility
            row[param.field] = convertToString(row[param.field])
          }
        }
      })

      return row
    })
  }

  function processData() {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Processing schedule data', {
      dataCount: state.scheduleData.length,
      customParametersCount: state.customParameters.length,
      selectedParentCategories: selectedParentCategories.value,
      selectedChildCategories: selectedChildCategories.value
    })

    try {
      // Step 1: Evaluate custom parameters
      const evaluatedData = state.scheduleData.map((element) => {
        const evaluatedElement = evaluateCustomParameters(element)
        if (element.details) {
          evaluatedElement.details = element.details.map((child) =>
            evaluateCustomParameters(child)
          )
        }
        return evaluatedElement
      })

      // Step 2: Filter and organize data
      const organizedData = filterAndOrganizeData(evaluatedData)

      // Step 3: Transform to table rows
      const tableRows = transformToTableRows(organizedData)

      // Update state
      updateEvaluatedData(evaluatedData)
      updateTableData(tableRows)

      debug.log(DebugCategories.DATA_TRANSFORM, 'Data processing complete', {
        evaluatedCount: evaluatedData.length,
        organizedCount: organizedData.length,
        tableRowsCount: tableRows.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process data:', err)
      handleError(err instanceof Error ? err : new Error('Failed to process data'))
    }
  }

  function updateVisibility(elementId: string, visible: boolean) {
    debug.log(DebugCategories.DATA_TRANSFORM, 'Updating element visibility', {
      elementId,
      visible
    })

    try {
      const updatedData = state.tableData.map((row) => {
        if (row.id === elementId) {
          return { ...row, _visible: visible }
        }
        if (row.details) {
          return {
            ...row,
            details: row.details.map((detail) =>
              detail.id === elementId ? { ...detail, _visible: visible } : detail
            )
          }
        }
        return row
      })

      updateTableData(updatedData)
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update visibility:', err)
      handleError(err instanceof Error ? err : new Error('Failed to update visibility'))
    }
  }

  return {
    processData,
    updateVisibility,
    evaluateCustomParameters,
    filterAndOrganizeData,
    transformToTableRows
  }
}
