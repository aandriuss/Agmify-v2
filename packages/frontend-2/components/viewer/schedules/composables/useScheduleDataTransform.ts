import { computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'
import { transformToTableRowData } from '~/components/viewer/components/tables/DataTable/composables/useTableUtils'

interface UseScheduleDataTransformOptions {
  scheduleData: Ref<ElementData[]> | ComputedRef<ElementData[]>
  evaluatedData: Ref<ElementData[]> | ComputedRef<ElementData[]>
  customParameters: Ref<CustomParameter[]> | ComputedRef<CustomParameter[]>
  mergedTableColumns: Ref<ColumnDef[]> | ComputedRef<ColumnDef[]>
  mergedDetailColumns: Ref<ColumnDef[]> | ComputedRef<ColumnDef[]>
  selectedParentCategories?: Ref<string[]> | ComputedRef<string[]>
  selectedChildCategories?: Ref<string[]> | ComputedRef<string[]>
  isInitialized?: Ref<boolean>
}

// Type guard to ensure we have valid ElementData
const isValidElementData = (item: unknown): item is ElementData => {
  if (!item || typeof item !== 'object') return false
  const record = item as Record<string, unknown>

  // Required fields
  const hasId = 'id' in record && typeof record.id === 'string'
  const hasMark = 'mark' in record && typeof record.mark === 'string'
  const hasCategory = 'category' in record && typeof record.category === 'string'
  const hasType = 'type' in record && typeof record.type === 'string'

  // Optional fields
  const hasValidName =
    !('name' in record) || record.name === null || typeof record.name === 'string'
  const hasValidHost =
    !('host' in record) || record.host === null || typeof record.host === 'string'
  const hasValidDetails = !('details' in record) || Array.isArray(record.details)

  const isValid =
    hasId &&
    hasMark &&
    hasCategory &&
    hasType &&
    hasValidName &&
    hasValidHost &&
    hasValidDetails

  if (!isValid) {
    debug.warn(DebugCategories.VALIDATION, 'Invalid element data:', {
      timestamp: new Date().toISOString(),
      value: record,
      validation: {
        hasId,
        hasMark,
        hasCategory,
        hasType,
        hasValidName,
        hasValidHost,
        hasValidDetails
      },
      keys: Object.keys(record)
    })
  }
  return isValid
}

export function useScheduleDataTransform(options: UseScheduleDataTransformOptions) {
  const {
    scheduleData,
    evaluatedData,
    customParameters,
    mergedTableColumns,
    mergedDetailColumns
  } = options

  // Use filtered data directly from scheduleData or evaluatedData
  const filteredData = computed(() => {
    const sourceData =
      evaluatedData.value.length > 0 ? evaluatedData.value : scheduleData.value

    debug.log(DebugCategories.DATA_TRANSFORM, 'Using filtered data:', {
      timestamp: new Date().toISOString(),
      source: evaluatedData.value.length > 0 ? 'evaluated' : 'schedule',
      count: sourceData.length,
      validation: {
        hasData: sourceData.length > 0,
        firstItemValid: sourceData[0] && isValidElementData(sourceData[0]),
        allItemsValid: sourceData.every(isValidElementData)
      }
    })

    return sourceData
  })

  // Transform filtered data to table format
  const tableData = computed<TableRowData[]>(() => {
    debug.startState('computeTableData')

    const data = filteredData.value
    if (data.length === 0) {
      debug.warn(DebugCategories.VALIDATION, 'No data to transform')
      return []
    }

    // Transform to table format
    const transformedData = transformToTableRowData(data)

    debug.log(DebugCategories.DATA_TRANSFORM, 'Data transformation complete:', {
      timestamp: new Date().toISOString(),
      inputCount: data.length,
      outputCount: transformedData.length,
      firstResult: transformedData[0],
      withDetails: transformedData.filter(
        (item) => Array.isArray(item.details) && item.details.length > 0
      ).length,
      validation: {
        hasData: transformedData.length > 0,
        firstItemValid: transformedData[0] && isValidElementData(transformedData[0]),
        allItemsValid: transformedData.every(isValidElementData)
      }
    })

    debug.completeState('computeTableData')
    return transformedData
  })

  // Debug watchers
  watch(
    () => tableData.value,
    (newData) => {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Table data changed:', {
        timestamp: new Date().toISOString(),
        count: newData.length,
        firstItem: newData[0],
        validation: {
          hasData: newData.length > 0,
          firstItemValid: newData[0] && isValidElementData(newData[0]),
          allItemsValid: newData.every(isValidElementData)
        },
        columns: mergedTableColumns.value.map((col) => ({
          field: col.field,
          visible: col.visible,
          isCustom: 'isCustomParameter' in col
        }))
      })
    },
    { immediate: true }
  )

  watch(
    [
      () => scheduleData.value,
      () => evaluatedData.value,
      () => customParameters.value,
      () => mergedTableColumns.value,
      () => mergedDetailColumns.value
    ],
    ([newScheduleData, newEvaluatedData, newParams, newTableCols, newDetailCols]) => {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Dependencies changed:', {
        timestamp: new Date().toISOString(),
        scheduleData: {
          count: newScheduleData.length,
          valid: newScheduleData.every(isValidElementData)
        },
        evaluatedData: {
          count: newEvaluatedData.length,
          valid: newEvaluatedData.every(isValidElementData)
        },
        parameters: {
          count: newParams.length
        },
        columns: {
          table: newTableCols.length,
          detail: newDetailCols.length,
          visibleTable: newTableCols.filter((col) => col.visible).length,
          visibleDetail: newDetailCols.filter((col) => col.visible).length
        }
      })
    },
    { immediate: true }
  )

  return {
    tableData,
    isValidElementData,
    filteredData
  }
}
