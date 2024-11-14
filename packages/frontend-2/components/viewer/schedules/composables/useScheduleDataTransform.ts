import { computed, ref, watch } from 'vue'
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

// Modified validation to support progressive loading
const isValidElementData = (
  item: unknown,
  requiredFields: string[] = ['id', 'mark', 'category']
): item is ElementData => {
  if (!item || typeof item !== 'object') return false
  const record = item as Record<string, unknown>

  // Check only required fields
  const hasRequiredFields = requiredFields.every((field) => {
    const value = record[field]
    return value !== undefined && value !== null
  })

  if (!hasRequiredFields) {
    debug.warn(DebugCategories.VALIDATION, 'Missing required fields:', {
      timestamp: new Date().toISOString(),
      value: record,
      requiredFields,
      missingFields: requiredFields.filter((field) => {
        const value = record[field]
        return value === undefined || value === null
      })
    })
  }

  return hasRequiredFields
}

export function useScheduleDataTransform(options: UseScheduleDataTransformOptions) {
  const { scheduleData, evaluatedData, mergedTableColumns, mergedDetailColumns } =
    options

  // Track transformation state
  const isTransformingData = ref(false)
  const hasFullTransform = ref(false)
  const transformedData = ref<TableRowData[]>([])

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
        allItemsValid: sourceData.every((item) =>
          isValidElementData(item, ['id', 'mark', 'category'])
        )
      }
    })

    return sourceData
  })

  // Transform data progressively
  function transformData() {
    if (isTransformingData.value || filteredData.value.length === 0) return

    try {
      isTransformingData.value = true
      debug.startState('transformData')

      // First pass: Transform essential fields
      const basicTransform = filteredData.value.map((item) => ({
        id: item.id,
        mark: item.mark,
        category: item.category,
        type: item.type
      }))

      transformedData.value = basicTransform as TableRowData[]

      // Second pass: Full transformation
      queueMicrotask(() => {
        try {
          const fullTransform = transformToTableRowData(filteredData.value)
          transformedData.value = fullTransform
          hasFullTransform.value = true

          debug.log(DebugCategories.DATA_TRANSFORM, 'Full transformation complete:', {
            timestamp: new Date().toISOString(),
            inputCount: filteredData.value.length,
            outputCount: fullTransform.length,
            withDetails: fullTransform.filter(
              (item) => Array.isArray(item.details) && item.details.length > 0
            ).length
          })
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Error in full transformation:', error)
        } finally {
          isTransformingData.value = false
        }
      })

      debug.log(DebugCategories.DATA_TRANSFORM, 'Basic transformation complete:', {
        timestamp: new Date().toISOString(),
        count: basicTransform.length,
        fields: Object.keys(basicTransform[0] || {})
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error transforming data:', error)
      isTransformingData.value = false
    }
  }

  // Computed table data with progressive loading
  const tableData = computed<TableRowData[]>(() => {
    if (transformedData.value.length === 0) {
      debug.warn(DebugCategories.VALIDATION, 'No transformed data available')
      return []
    }

    debug.log(DebugCategories.DATA_TRANSFORM, 'Returning table data:', {
      timestamp: new Date().toISOString(),
      count: transformedData.value.length,
      isFullTransform: hasFullTransform.value,
      firstItem: transformedData.value[0],
      availableFields: Object.keys(transformedData.value[0] || {})
    })

    return transformedData.value
  })

  // Watch for data changes
  watch(
    [filteredData, mergedTableColumns, mergedDetailColumns],
    () => {
      hasFullTransform.value = false
      transformData()
    },
    { immediate: true }
  )

  // Debug watchers
  watch(
    () => tableData.value,
    (newData) => {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Table data changed:', {
        timestamp: new Date().toISOString(),
        count: newData.length,
        isFullTransform: hasFullTransform.value,
        validation: {
          hasData: newData.length > 0,
          firstItemValid: newData[0] && isValidElementData(newData[0]),
          allItemsValid: newData.every((item) =>
            isValidElementData(item, ['id', 'mark', 'category'])
          )
        }
      })
    },
    { immediate: true }
  )

  return {
    tableData,
    isValidElementData,
    filteredData,
    isTransformingData,
    hasFullTransform
  }
}
