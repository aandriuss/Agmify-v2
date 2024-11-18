import { computed, type ComputedRef } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { TableRowData } from '../types'
import { debug, DebugCategories } from '../utils/debug'

interface UseTableViewOptions {
  mergedTableColumns: ComputedRef<ColumnDef[]>
  tableData: ComputedRef<TableRowData[]>
}

interface UseTableViewReturn {
  canShowTable: ComputedRef<boolean>
}

export function useTableView(options: UseTableViewOptions): UseTableViewReturn {
  const { mergedTableColumns, tableData } = options

  // Check if we have data to show in the table
  const canShowTable = computed(() => {
    const hasData = tableData.value.length > 0
    const hasColumns = mergedTableColumns.value.some((col) => col.visible)

    // If we have data but no visible columns, we'll show ID column by default
    const shouldShow = hasData && (hasColumns || true) // Always show if we have data

    debug.log(DebugCategories.TABLE_UPDATES, 'Table visibility check:', {
      hasData,
      hasColumns,
      shouldShow,
      visibleColumns: mergedTableColumns.value
        .filter((col) => col.visible)
        .map((col) => col.field),
      totalColumns: mergedTableColumns.value.length,
      totalData: tableData.value.length,
      firstRow: tableData.value[0]
    })

    return shouldShow
  })

  return {
    canShowTable
  }
}
