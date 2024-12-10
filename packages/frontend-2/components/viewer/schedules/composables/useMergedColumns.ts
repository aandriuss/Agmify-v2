import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ColumnDef } from '~/composables/core/types'
import { defaultColumns, defaultDetailColumns } from '../config/defaultColumns'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

interface UseMergedColumnsOptions {
  currentTableColumns: ComputedRef<ColumnDef[]>
  currentDetailColumns: ComputedRef<ColumnDef[]>
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
  selectedParentCategories?: ComputedRef<string[]>
  selectedChildCategories?: ComputedRef<string[]>
  isInitialized?: Ref<boolean>
}

export function useMergedColumns(options: UseMergedColumnsOptions) {
  const {
    currentTableColumns,
    currentDetailColumns,
    parameterColumns,
    selectedParentCategories,
    selectedChildCategories,
    isInitialized
  } = options

  // Get base columns, using defaults if settings are empty
  const baseTableColumns = computed<ColumnDef[]>(() => {
    // Wait for initialization before using current columns
    if (isInitialized?.value && currentTableColumns.value?.length) {
      return currentTableColumns.value
    }
    debug.log(DebugCategories.COLUMNS, 'Using default table columns')
    return defaultColumns
  })

  const baseDetailColumns = computed<ColumnDef[]>(() => {
    // Wait for initialization before using current columns
    if (isInitialized?.value && currentDetailColumns.value?.length) {
      return currentDetailColumns.value
    }
    debug.log(DebugCategories.COLUMNS, 'Using default detail columns')
    return defaultDetailColumns
  })

  // Filter parameter columns based on category selection if categories are provided
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

    // If no category selection is provided, return all valid parameter columns
    if (!selectedParentCategories || !selectedChildCategories) {
      return validParams
    }

    const hasCategories =
      selectedParentCategories.value?.length > 0 ||
      selectedChildCategories.value?.length > 0
    if (!hasCategories) {
      // If no categories selected, show all valid parameter columns
      return validParams
    }

    return validParams.filter((col) => {
      const isParentParam = !col.category?.includes('Child') // Assuming child parameters have 'Child' in category
      if (isParentParam) {
        return (
          !selectedParentCategories.value?.length ||
          selectedParentCategories.value.some((cat) => col.category?.includes(cat))
        )
      } else {
        return (
          !selectedChildCategories.value?.length ||
          selectedChildCategories.value.some((cat) => col.category?.includes(cat))
        )
      }
    })
  })

  const mergedTableColumns = computed<ColumnDef[]>(() => {
    const baseColumns = baseTableColumns.value
    const paramCols = filteredParamColumns.value.map(
      (col, index): ColumnDef => ({
        field: col.field,
        header: col.header,
        type: col.type || 'string', // Provide default type
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        order: baseColumns.length + index,
        category: col.category || '',
        description: col.description || '',
        isFixed: false
      })
    )

    const mergedColumns = [...baseColumns, ...paramCols]

    debug.log(DebugCategories.COLUMNS, 'Merged table columns:', {
      timestamp: new Date().toISOString(),
      baseColumnCount: baseColumns.length,
      paramColumnCount: paramCols.length,
      totalColumns: mergedColumns.length,
      visibleColumns: mergedColumns.filter((col) => col.visible).length,
      isInitialized: isInitialized?.value,
      selectedParentCategories: selectedParentCategories?.value,
      selectedChildCategories: selectedChildCategories?.value,
      firstColumn: mergedColumns[0],
      allColumns: mergedColumns
    })

    return mergedColumns
  })

  const mergedDetailColumns = computed<ColumnDef[]>(() => {
    const baseColumns = baseDetailColumns.value
    const paramCols = filteredParamColumns.value.map(
      (col, index): ColumnDef => ({
        field: col.field,
        header: col.header,
        type: col.type || 'string', // Provide default type
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        order: baseColumns.length + index,
        category: col.category || '',
        description: col.description || '',
        isFixed: false
      })
    )

    const mergedColumns = [...baseColumns, ...paramCols]

    debug.log(DebugCategories.COLUMNS, 'Merged detail columns:', {
      timestamp: new Date().toISOString(),
      baseColumnCount: baseColumns.length,
      paramColumnCount: paramCols.length,
      totalColumns: mergedColumns.length,
      visibleColumns: mergedColumns.filter((col) => col.visible).length,
      isInitialized: isInitialized?.value,
      selectedParentCategories: selectedParentCategories?.value,
      selectedChildCategories: selectedChildCategories?.value,
      firstColumn: mergedColumns[0],
      allColumns: mergedColumns
    })

    return mergedColumns
  })

  return {
    mergedTableColumns,
    mergedDetailColumns
  }
}
