import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ElementData, TableRow } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { useDebug, DebugCategories } from '../debug/useDebug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'

// Initialize debug
const debug = useDebug()

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
    debug.warn(DebugCategories.DATA_VALIDATION, 'Missing required fields:', {
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
  const {
    scheduleData,
    evaluatedData,
    mergedTableColumns,
    mergedDetailColumns,
    isInitialized
  } = options

  // Track transformation state
  const isTransformingData = ref(false)
  const hasFullTransform = ref(false)
  const transformedData = ref<TableRow[]>([])

  // Merge default columns with parameter columns
  const finalTableColumns = computed(() =>
    mergeColumns(mergedTableColumns.value, defaultColumns)
  )

  const finalDetailColumns = computed(() =>
    mergeColumns(mergedDetailColumns.value, defaultDetailColumns)
  )

  // Use filtered data directly from scheduleData or evaluatedData
  const filteredData = computed(() => {
    // Wait for initialization
    if (!isInitialized?.value) {
      debug.warn(DebugCategories.STATE, 'Waiting for initialization')
      return []
    }

    return evaluatedData.value.length > 0 ? evaluatedData.value : scheduleData.value
  })

  // Transform data progressively
  function transformData() {
    if (!isInitialized?.value) {
      debug.warn(DebugCategories.STATE, 'Cannot transform data before initialization')
      return
    }

    if (isTransformingData.value) {
      debug.warn(DebugCategories.STATE, 'Data transformation already in progress')
      return
    }

    if (filteredData.value.length === 0) {
      debug.warn(
        DebugCategories.DATA_VALIDATION,
        'No data available for transformation'
      )
      return
    }

    try {
      isTransformingData.value = true
      debug.startState(DebugCategories.DATA_TRANSFORM, 'Starting data transformation')

      // First pass: Transform essential fields with basic parameter states
      const basicTransform = filteredData.value.map((el) => createBasicTableRow(el))
      transformedData.value = basicTransform

      // Second pass: Full transformation
      queueMicrotask(() => {
        try {
          const fullTransform = filteredData.value.map((el) => transformToTableRow(el))
          transformedData.value = fullTransform
          hasFullTransform.value = true

          debug.completeState(
            DebugCategories.DATA_TRANSFORM,
            'Data transformation complete',
            {
              count: fullTransform.length,
              columnCount: finalTableColumns.value?.length || 0
            }
          )
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Error in full transformation:', error)
        } finally {
          isTransformingData.value = false
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error transforming data:', error)
      isTransformingData.value = false
    }
  }

  // Watch for data changes
  watch(
    [filteredData, mergedTableColumns, mergedDetailColumns],
    () => {
      hasFullTransform.value = false
      transformData()
    },
    { immediate: true }
  )

  return {
    tableData: computed(() => transformedData.value),
    columns: finalTableColumns,
    detailColumns: finalDetailColumns,
    isValidElementData,
    filteredData,
    isTransformingData,
    hasFullTransform
  }
}

// Helper functions
function mergeColumns(columns: ColumnDef[], defaultCols: ColumnDef[]): ColumnDef[] {
  const result: ColumnDef[] = []
  const usedFields = new Set<string>()

  // First add essential columns from defaults in their original order
  defaultCols.forEach((defaultCol) => {
    const existingCol = columns.find((col) => col.field === defaultCol.field)
    if (existingCol) {
      result.push({
        ...defaultCol,
        ...existingCol,
        visible: existingCol.visible ?? defaultCol.visible,
        order: existingCol.order ?? defaultCol.order
      })
    } else {
      result.push({ ...defaultCol })
    }
    usedFields.add(defaultCol.field)
  })

  // Then add any remaining columns that weren't in defaults
  columns.forEach((col) => {
    if (!usedFields.has(col.field)) {
      result.push({ ...col })
      usedFields.add(col.field)
    }
  })

  return result.sort((a, b) => (a.order || 0) - (b.order || 0))
}

function transformToTableRow(element: ElementData): TableRow {
  return {
    id: element.id,
    type: element.type || '',
    mark: element.mark,
    category: element.category,
    parameters: element.parameters || {},
    _visible: true,
    isChild: element.isChild,
    host: element.host,
    _raw: element._raw,
    details: element.details?.map(transformToTableRow)
  }
}

function createBasicTableRow(element: ElementData): TableRow {
  // Use the same transformation as full transform for consistency
  return transformToTableRow(element)
}
