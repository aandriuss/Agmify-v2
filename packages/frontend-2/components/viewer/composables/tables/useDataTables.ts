import { ref, computed } from 'vue'

export interface Column {
  field: string
  header: string
  visible: boolean
}

export interface DetailColumn {
  field: string
  header: string
}

export function useDataTable(
  initialColumns: Column[],
  initialDetailColumns: DetailColumn[]
) {
  const dialogOpen = ref(false)
  const expandedRows = ref([])
  const columns = ref(initialColumns)
  const detailColumns = ref(initialDetailColumns)

  const visibleColumns = computed(() => {
    return columns.value.filter((col) => col.visible)
  })

  return {
    dialogOpen,
    expandedRows,
    columns,
    detailColumns,
    visibleColumns
  }
}
