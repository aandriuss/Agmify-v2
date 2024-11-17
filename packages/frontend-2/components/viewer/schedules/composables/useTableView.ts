import { computed, type ComputedRef } from 'vue'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { TableRowData } from '../types'

interface UseTableViewOptions {
  mergedTableColumns: ComputedRef<ColumnDef[]>
  tableData: ComputedRef<TableRowData[]>
}

interface UseTableViewReturn {
  canShowTable: ComputedRef<boolean>
}

export function useTableView(options: UseTableViewOptions): UseTableViewReturn {
  const { mergedTableColumns, tableData } = options

  // Check if we have the minimum required data to show the table
  const canShowTable = computed(() => {
    const hasMinimalColumns = mergedTableColumns.value.some(
      (col) => col.visible && ['mark', 'category'].includes(col.field)
    )
    const hasData = tableData.value.length > 0

    return hasMinimalColumns && hasData
  })

  return {
    canShowTable
  }
}
