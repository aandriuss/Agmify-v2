import { computed, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ElementData, TableRowData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug } from '../utils/debug'
import { transformToTableRowData } from '~/components/viewer/components/tables/DataTable/composables/useTableUtils'

interface UseScheduleDataTransformOptions {
  scheduleData: Ref<ElementData[]> | ComputedRef<ElementData[]>
  evaluatedData: Ref<ElementData[]> | ComputedRef<ElementData[]>
  customParameters: Ref<CustomParameter[]> | ComputedRef<CustomParameter[]>
  mergedTableColumns: Ref<ColumnDef[]> | ComputedRef<ColumnDef[]>
  mergedDetailColumns: Ref<ColumnDef[]> | ComputedRef<ColumnDef[]>
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
  const hasDetails = 'details' in record && Array.isArray(record.details)

  // Optional fields
  const hasValidName =
    !('name' in record) || record.name === null || typeof record.name === 'string'
  const hasValidHost =
    !('host' in record) || record.host === null || typeof record.host === 'string'

  const isValid =
    hasId &&
    hasMark &&
    hasCategory &&
    hasType &&
    hasDetails &&
    hasValidName &&
    hasValidHost

  if (!isValid) {
    debug.warn('❌ Invalid element data:', {
      timestamp: new Date().toISOString(),
      value: record,
      validation: {
        hasId,
        hasMark,
        hasCategory,
        hasType,
        hasDetails,
        hasValidName,
        hasValidHost
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

  // Validate source data before transformation
  const validSourceData = computed(() => {
    // Check for visible parameter columns
    const hasVisibleParameterColumns =
      mergedTableColumns.value.some(
        (col) => 'isCustomParameter' in col && col.visible
      ) ||
      mergedDetailColumns.value.some((col) => 'isCustomParameter' in col && col.visible)

    // Select source data based on parameters
    const sourceData =
      hasVisibleParameterColumns && customParameters.value.length > 0
        ? evaluatedData.value
        : scheduleData.value

    // Filter out invisible items
    const visibleData = sourceData.filter((item) => {
      const isVisible = '_visible' in item ? item._visible : true
      return isVisible
    })

    debug.log('🔍 SOURCE DATA SELECTION:', {
      timestamp: new Date().toISOString(),
      source: hasVisibleParameterColumns ? 'evaluatedData' : 'scheduleData',
      hasCustomParameters: customParameters.value.length > 0,
      totalCount: sourceData?.length || 0,
      visibleCount: visibleData?.length || 0,
      firstItem: visibleData?.[0],
      columns: {
        tableColumns: mergedTableColumns.value.length,
        detailColumns: mergedDetailColumns.value.length,
        visibleParameterColumns: mergedTableColumns.value.filter(
          (col) => 'isCustomParameter' in col && col.visible
        ).length
      }
    })

    if (!Array.isArray(visibleData)) {
      debug.error('❌ Source data is not an array:', visibleData)
      return []
    }

    // Validate each item
    const validItems = visibleData.filter((item) => {
      const valid = isValidElementData(item)
      if (!valid) {
        debug.warn('❌ Invalid item filtered out:', {
          timestamp: new Date().toISOString(),
          item,
          validation: {
            hasId: item && typeof item === 'object' && 'id' in item,
            hasMark: item && typeof item === 'object' && 'mark' in item,
            hasCategory: item && typeof item === 'object' && 'category' in item,
            hasType: item && typeof item === 'object' && 'type' in item,
            hasDetails:
              item &&
              typeof item === 'object' &&
              'details' in item &&
              Array.isArray(item.details),
            hasValidName:
              !('name' in item) || item.name === null || typeof item.name === 'string',
            hasValidHost:
              !('host' in item) || item.host === null || typeof item.host === 'string'
          }
        })
      }
      return valid
    })

    debug.log('✅ Valid source data:', {
      timestamp: new Date().toISOString(),
      totalItems: visibleData.length,
      validItems: validItems.length,
      invalidItems: visibleData.length - validItems.length,
      firstValidItem: validItems[0]
    })

    return validItems
  })

  // Transform valid data to table format
  const tableData = computed<TableRowData[]>(() => {
    debug.startState('computeTableData')

    const validData = validSourceData.value
    if (validData.length === 0) {
      debug.warn('No valid data to transform')
      return []
    }

    // Transform data to table format
    const transformedData = transformToTableRowData(validData)

    debug.log('✅ Data transformation complete:', {
      timestamp: new Date().toISOString(),
      inputCount: validData.length,
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
      debug.log('🔄 Table data changed:', {
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
      debug.log('🔄 Dependencies changed:', {
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
    isValidElementData
  }
}
