import { ref, computed } from 'vue'
import type { ColumnDef } from '../composables/types'

interface UseColumnManagerOptions {
  initialParentColumns: ColumnDef[]
  initialChildColumns: ColumnDef[]
  onUpdate?: (updates: {
    parentColumns: ColumnDef[]
    childColumns: ColumnDef[]
  }) => void
}

export function useColumnManager(options: UseColumnManagerOptions) {
  // Local state
  const dialogOpen = ref(false)
  const isSaving = ref(false)
  const localParentColumns = ref<ColumnDef[]>(
    JSON.parse(JSON.stringify(options.initialParentColumns))
  )
  const localChildColumns = ref<ColumnDef[]>(
    JSON.parse(JSON.stringify(options.initialChildColumns))
  )
  const tempParentColumns = ref<ColumnDef[]>([])
  const tempChildColumns = ref<ColumnDef[]>([])

  // Methods
  const openDialog = () => {
    tempParentColumns.value = JSON.parse(JSON.stringify(localParentColumns.value))
    tempChildColumns.value = JSON.parse(JSON.stringify(localChildColumns.value))
    dialogOpen.value = true
  }

  const handleCancel = () => {
    tempParentColumns.value = JSON.parse(JSON.stringify(localParentColumns.value))
    tempChildColumns.value = JSON.parse(JSON.stringify(localChildColumns.value))
    dialogOpen.value = false
  }

  const handleColumnResize = (event: any) => {
    const { element, delta } = event
    const field = element.dataset.field

    const updateColumn = (columns: ColumnDef[]) => {
      const column = columns.find((col) => col.field === field)
      if (column) {
        column.width = element.offsetWidth
      }
    }

    updateColumn(localParentColumns.value)
    updateColumn(localChildColumns.value)
  }

  const handleColumnReorder = async (event: any) => {
    try {
      isSaving.value = true

      const dataTable = event?.target?.closest('.p-datatable')
      if (!dataTable) return

      const isNestedTable = dataTable.classList.contains('nested-table')
      const headers = Array.from(dataTable.querySelectorAll('th[data-field]'))

      const reorderedColumns = headers
        .map((header: Element, index: number) => {
          const field = header.getAttribute('data-field')
          const sourceColumns = isNestedTable
            ? localChildColumns.value
            : localParentColumns.value
          const existingColumn = sourceColumns.find((col) => col.field === field)

          if (!existingColumn) return null

          return {
            ...existingColumn,
            order: index,
            visible: existingColumn.visible ?? true
          }
        })
        .filter(Boolean) as ColumnDef[]

      if (isNestedTable) {
        localChildColumns.value = reorderedColumns
      } else {
        localParentColumns.value = reorderedColumns
      }

      options.onUpdate?.({
        parentColumns: localParentColumns.value,
        childColumns: localChildColumns.value
      })
    } finally {
      isSaving.value = false
    }
  }

  return {
    // State
    dialogOpen,
    isSaving,
    localParentColumns,
    localChildColumns,
    tempParentColumns,
    tempChildColumns,

    // Methods
    openDialog,
    handleCancel,
    handleColumnResize,
    handleColumnReorder
  }
}
