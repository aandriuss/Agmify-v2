import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ElementData, TableRow, ParameterValueState } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug, DebugCategories } from '../utils/debug'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'

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

function extractParameterValue(value: unknown): unknown {
  // If it's not a string, return as is
  if (typeof value !== 'string') {
    return value
  }

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(value)

    // If it's a ParameterValueState, return its currentValue
    if (parsed && typeof parsed === 'object' && 'currentValue' in parsed) {
      // If currentValue is itself a stringified JSON, parse it recursively
      if (typeof parsed.currentValue === 'string') {
        return extractParameterValue(parsed.currentValue)
      }
      return parsed.currentValue
    }

    // If it's a plain object/array, return the original string
    return value
  } catch {
    // If parsing fails, return original value
    return value
  }
}

function transformToTableRow(element: ElementData): TableRow {
  // Create a proxy object that will return extracted currentValue for parameter access
  const parameters = new Proxy(element.parameters || {}, {
    get(target, prop) {
      if (typeof prop !== 'string') return undefined
      const value = target[prop]
      if (!value) return null

      // Extract the actual value from ParameterValueState
      if (typeof value === 'object' && 'currentValue' in value) {
        return extractParameterValue(value.currentValue)
      }

      return extractParameterValue(value)
    }
  })

  // Log parameter values for debugging
  debug.log(DebugCategories.DATA_TRANSFORM, 'Parameter values:', {
    id: element.id,
    mark: element.mark,
    parameterKeys: Object.keys(element.parameters || {}),
    sampleValues: Object.entries(element.parameters || {})
      .slice(0, 3)
      .reduce((acc, [key, value]) => {
        acc[key] = {
          currentValue: value.currentValue,
          fetchedValue: value.fetchedValue,
          previousValue: value.previousValue,
          userValue: value.userValue
        }
        return acc
      }, {} as Record<string, ParameterValueState>)
  })

  return {
    id: element.id,
    mark: element.mark,
    category: element.category,
    type: element.type || '',
    host: element.host,
    parameters,
    _visible: true,
    isChild: element.isChild,
    _raw: element._raw
  }
}

function createBasicTableRow(element: ElementData): TableRow {
  // Use the same transformation as full transform for consistency
  return transformToTableRow(element)
}

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

    const sourceData =
      evaluatedData.value.length > 0 ? evaluatedData.value : scheduleData.value

    // Log column configuration
    debug.log(DebugCategories.DATA_TRANSFORM, 'Column configuration:', {
      columns: finalTableColumns.value?.map((col) => ({
        field: col.field,
        header: col.header,
        visible: col.visible,
        source: col.source,
        type: col.type,
        order: col.order
      }))
    })

    // Log data structure
    debug.log(DebugCategories.DATA_TRANSFORM, 'Source data structure:', {
      count: sourceData.length,
      firstItem: sourceData[0]
        ? {
            id: sourceData[0].id,
            mark: sourceData[0].mark,
            parameterKeys: Object.keys(sourceData[0].parameters || {}),
            sampleValues: Object.entries(sourceData[0].parameters || {})
              .slice(0, 3)
              .reduce((acc, [key, value]) => {
                acc[key] = {
                  currentValue: value.currentValue,
                  fetchedValue: value.fetchedValue,
                  previousValue: value.previousValue,
                  userValue: value.userValue
                }
                return acc
              }, {} as Record<string, ParameterValueState>)
          }
        : null
    })

    return sourceData
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
      debug.warn(DebugCategories.VALIDATION, 'No data available for transformation')
      return
    }

    try {
      isTransformingData.value = true
      debug.startState('transformData')

      // First pass: Transform essential fields with basic parameter states
      const basicTransform = filteredData.value.map((el) => createBasicTableRow(el))
      transformedData.value = basicTransform

      // Second pass: Full transformation
      queueMicrotask(() => {
        try {
          const fullTransform = filteredData.value.map((el) => transformToTableRow(el))
          transformedData.value = fullTransform
          hasFullTransform.value = true

          // Log transformed data structure
          debug.log(DebugCategories.DATA_TRANSFORM, 'Transformed data structure:', {
            count: fullTransform.length,
            firstItem: fullTransform[0]
              ? {
                  id: fullTransform[0].id,
                  mark: fullTransform[0].mark,
                  parameterKeys: Object.keys(fullTransform[0].parameters || {}),
                  sampleValues: Object.entries(fullTransform[0].parameters || {})
                    .slice(0, 3)
                    .reduce((acc, [key, value]) => {
                      acc[key] = value
                      return acc
                    }, {} as Record<string, unknown>)
                }
              : null,
            columns: finalTableColumns.value?.map((col) => ({
              field: col.field,
              header: col.header,
              visible: col.visible,
              source: col.source,
              type: col.type,
              order: col.order
            }))
          })
        } catch (error) {
          debug.error(DebugCategories.ERROR, 'Error in full transformation:', error)
        } finally {
          isTransformingData.value = false
          debug.completeState('transformData')
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
    ([newData]) => {
      debug.log(DebugCategories.DATA_TRANSFORM, 'Data dependencies changed:', {
        dataLength: newData?.length || 0,
        columnsLength: finalTableColumns.value?.length || 0,
        detailColumnsLength: finalDetailColumns.value?.length || 0,
        isInitialized: isInitialized?.value,
        sampleData: newData?.[0]
          ? {
              id: newData[0].id,
              mark: newData[0].mark,
              parameterKeys: Object.keys(newData[0].parameters || {}),
              sampleValues: Object.entries(newData[0].parameters || {})
                .slice(0, 3)
                .reduce((acc, [key, value]) => {
                  acc[key] = {
                    currentValue: value.currentValue,
                    fetchedValue: value.fetchedValue,
                    previousValue: value.previousValue,
                    userValue: value.userValue
                  }
                  return acc
                }, {} as Record<string, ParameterValueState>)
            }
          : null
      })

      hasFullTransform.value = false
      transformData()
    },
    { immediate: true }
  )

  return {
    tableData: computed(() => {
      if (!transformedData.value.length) return []

      // Log final data structure being sent to table
      debug.log(DebugCategories.DATA_TRANSFORM, 'Final table data structure:', {
        count: transformedData.value.length,
        firstItem: transformedData.value[23]
          ? {
              id: transformedData.value[0].id,
              mark: transformedData.value[0].mark,
              parameterKeys: Object.keys(transformedData.value[0].parameters || {}),
              sampleValues: Object.entries(transformedData.value[0].parameters || {})
                .slice(0, 3)
                .reduce((acc, [key, value]) => {
                  acc[key] = value
                  return acc
                }, {} as Record<string, unknown>)
            }
          : null,
        columns: finalTableColumns.value?.map((col) => ({
          field: col.field,
          header: col.header,
          visible: col.visible,
          source: col.source,
          type: col.type,
          order: col.order
        }))
      })

      return transformedData.value
    }),
    columns: finalTableColumns,
    detailColumns: finalDetailColumns,
    isValidElementData,
    filteredData,
    isTransformingData,
    hasFullTransform
  }
}
