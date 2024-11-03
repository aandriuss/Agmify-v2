import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import type { ColumnDef, ParameterDefinition } from './types'

interface UseColumnManagementOptions {
  initialColumns: ColumnDef[]
  searchTerm?: Ref<string>
  isGrouped?: Ref<boolean>
  sortBy?: Ref<'name' | 'category' | 'type' | 'fixed'>
}

export function useColumnManagement({
  initialColumns,
  searchTerm = ref(''),
  isGrouped = ref(true),
  sortBy = ref('category' as const)
}: UseColumnManagementOptions) {
  // Initialize with empty array if initialColumns is undefined
  const columns = ref<ColumnDef[]>(initialColumns || [])
  const dragOverIndex = ref(-1)

  const filteredColumns = computed(() => {
    // Ensure we're working with an array
    let result = Array.isArray(columns.value) ? [...columns.value] : []

    if (searchTerm.value) {
      const normalizedSearch = searchTerm.value.toLowerCase().trim()
      result = result.filter(
        (col) =>
          col.header.toLowerCase().includes(normalizedSearch) ||
          col.field.toLowerCase().includes(normalizedSearch)
      )
    }

    // Apply sorting
    return [...result].sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return a.header.localeCompare(b.header)
        case 'category':
          return (a.category || 'Other').localeCompare(b.category || 'Other')
        case 'type':
          return ((a as ParameterDefinition).type || '').localeCompare(
            (b as ParameterDefinition).type || ''
          )
        case 'fixed':
          if (a.isFixed === b.isFixed) {
            return a.header.localeCompare(b.header)
          }
          return a.isFixed ? -1 : 1
        default:
          return a.order - b.order
      }
    })
  })

  const groupedColumns = computed(() => {
    if (!isGrouped.value) return []

    const groups: Record<string, ColumnDef[]> = {}

    filteredColumns.value.forEach((col) => {
      const category = col.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(col)
    })

    return Object.entries(groups)
      .map(([category, cols]) => ({
        category,
        columns: cols.sort((a, b) => a.order - b.order)
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  })

  const updateColumns = (newColumns: ColumnDef[]) => {
    columns.value = newColumns
  }

  const handleDragStart = (event: DragEvent, column: ColumnDef, index: number) => {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', JSON.stringify({ column, index }))
    }
  }

  const handleDragEnter = (index: number) => {
    dragOverIndex.value = index
  }

  const handleDragLeave = () => {
    dragOverIndex.value = -1
  }

  const handleDrop = (event: DragEvent, dropIndex: number) => {
    event.preventDefault()
    const data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}')
    const dragIndex = data.index

    if (typeof dragIndex === 'number' && dragIndex !== dropIndex) {
      const updatedColumns = [...columns.value]
      const [movedColumn] = updatedColumns.splice(dragIndex, 1)
      updatedColumns.splice(dropIndex, 0, movedColumn)

      // Update order property
      updatedColumns.forEach((col, index) => {
        col.order = index
      })

      columns.value = updatedColumns
    }

    dragOverIndex.value = -1
  }

  // Watch for changes in initialColumns
  watch(
    () => initialColumns,
    (newColumns) => {
      columns.value = newColumns
    },
    { deep: true }
  )

  return {
    columns,
    dragOverIndex,
    filteredColumns,
    groupedColumns,
    updateColumns,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDrop
  }
}
