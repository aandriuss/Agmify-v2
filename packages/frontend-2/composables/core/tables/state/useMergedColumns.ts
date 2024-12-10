import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ColumnDef, UserValueType } from '~/composables/core/types'
import { createUserColumnDefWithDefaults } from '~/composables/core/types/tables/column-types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export interface UseMergedColumnsOptions {
  baseColumns: ComputedRef<ColumnDef[]>
  parameterColumns: ComputedRef<
    {
      field: string
      header: string
      type: string
      visible?: boolean
      removable?: boolean
      category?: string
      description?: string
    }[]
  >
  categoryFilter?: (column: ColumnDef) => boolean
  isInitialized?: Ref<boolean>
  defaultColumns?: ColumnDef[]
}

/**
 * Core column merging functionality
 * Handles merging base columns with parameter columns while respecting categories and initialization state
 */
export function useMergedColumns(options: UseMergedColumnsOptions) {
  const {
    baseColumns,
    parameterColumns,
    categoryFilter,
    isInitialized,
    defaultColumns = []
  } = options

  // Get base columns, using defaults if settings are empty
  const effectiveBaseColumns = computed<ColumnDef[]>(() => {
    // Wait for initialization before using current columns
    if (isInitialized?.value && baseColumns.value?.length) {
      return baseColumns.value
    }
    debug.log(DebugCategories.COLUMNS, 'Using default columns')
    return defaultColumns
  })

  // Filter parameter columns based on provided category filter
  const filteredParamColumns = computed(() => {
    // Wait for initialization before processing parameters
    if (!isInitialized?.value) {
      debug.log(DebugCategories.COLUMNS, 'Skipping parameter columns - not initialized')
      return []
    }

    // Ensure we have valid parameter columns
    const validParams = (parameterColumns.value || []).filter(
      (col): col is NonNullable<typeof col> => {
        if (!col) {
          debug.warn(DebugCategories.COLUMNS, 'Found null parameter column')
          return false
        }
        if (!col.field || !col.header) {
          debug.warn(DebugCategories.COLUMNS, 'Invalid parameter column:', col)
          return false
        }
        return true
      }
    )

    // If no category filter is provided, return all valid parameter columns
    if (!categoryFilter) {
      return validParams
    }

    return validParams.filter((col) => categoryFilter(col as ColumnDef))
  })

  const mergedColumns = computed<ColumnDef[]>(() => {
    const baseColumns = effectiveBaseColumns.value
    const paramCols = filteredParamColumns.value.map((col, index) =>
      createUserColumnDefWithDefaults({
        field: col.field,
        header: col.header,
        type: (col.type || 'text') as UserValueType,
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        order: baseColumns.length + index,
        category: col.category,
        description: col.description,
        group: 'Custom'
      })
    )

    const mergedColumns = [...baseColumns, ...paramCols]

    debug.log(DebugCategories.COLUMNS, 'Merged columns:', {
      timestamp: new Date().toISOString(),
      baseColumnCount: baseColumns.length,
      paramColumnCount: paramCols.length,
      totalColumns: mergedColumns.length,
      visibleColumns: mergedColumns.filter((col) => col.visible).length,
      isInitialized: isInitialized?.value,
      firstColumn: mergedColumns[0],
      allColumns: mergedColumns
    })

    return mergedColumns
  })

  return {
    mergedColumns
  }
}
