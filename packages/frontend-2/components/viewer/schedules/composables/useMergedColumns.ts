import { computed } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { debug } from '../utils/debug'

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
  isInitialized?: Ref<boolean>
}

export function useMergedColumns(options: UseMergedColumnsOptions) {
  const { currentTableColumns, currentDetailColumns, parameterColumns, isInitialized } =
    options

  const mergedTableColumns = computed<ColumnDef[]>(() => {
    // Always merge columns regardless of initialization state
    const baseColumns = currentTableColumns.value
    const paramCols = parameterColumns.value.map(
      (col, index): ColumnDef => ({
        field: col.field,
        header: col.header,
        type: col.type || 'string',
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        order: baseColumns.length + index,
        category: col.category,
        description: col.description,
        isFixed: false
      })
    )

    const mergedColumns = [...baseColumns, ...paramCols]

    debug.log('🔍 MERGED TABLE COLUMNS:', {
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

  const mergedDetailColumns = computed<ColumnDef[]>(() => {
    // Always merge columns regardless of initialization state
    const baseColumns = currentDetailColumns.value
    const paramCols = parameterColumns.value.map(
      (col, index): ColumnDef => ({
        field: col.field,
        header: col.header,
        type: col.type || 'string',
        visible: col.visible ?? true,
        removable: col.removable ?? true,
        order: baseColumns.length + index,
        category: col.category,
        description: col.description,
        isFixed: false
      })
    )

    const mergedColumns = [...baseColumns, ...paramCols]

    debug.log('🔍 MERGED DETAIL COLUMNS:', {
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
    mergedTableColumns,
    mergedDetailColumns
  }
}
