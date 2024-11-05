import { ref, computed, watch } from 'vue'
import type { ParameterDefinition } from '../../../../parameters/composables/types'
import type { ColumnDef, UseColumnsOptions } from './types'

// interface UseColumnsOptions {
//   initialColumns: (ColumnDef | ParameterDefinition)[]
//   searchTerm?: Ref<string>
//   isGrouped?: Ref<boolean>
//   sortBy?: Ref<'name' | 'category' | 'type' | 'fixed'>
// }

export function useColumns({
  initialColumns,
  searchTerm = ref(''),
  isGrouped = ref(true),
  sortBy = ref('category' as const)
}: UseColumnsOptions) {
  const columns = ref<(ColumnDef | ParameterDefinition)[]>(initialColumns || [])
  const dragOverIndex = ref(-1)

  const filteredColumns = computed(() => {
    let result = Array.isArray(columns.value) ? [...columns.value] : []

    if (searchTerm.value) {
      const normalizedSearch = searchTerm.value.toLowerCase().trim()
      result = result.filter((col) => {
        const header = 'header' in col ? col.header : col.field
        const field = col.field
        return (
          header.toLowerCase().includes(normalizedSearch) ||
          field.toLowerCase().includes(normalizedSearch)
        )
      })
    }

    return [...result].sort((a, b) => {
      switch (sortBy.value) {
        case 'name':
          return (a.header || a.field).localeCompare(b.header || b.field)
        case 'category':
          return (a.category || 'Other').localeCompare(b.category || 'Other')
        case 'type': {
          const typeA = 'type' in a ? a.type : 'unknown'
          const typeB = 'type' in b ? b.type : 'unknown'
          return typeA.localeCompare(typeB)
        }
        case 'fixed':
          if (a.isFixed === b.isFixed) {
            return (a.header || a.field).localeCompare(b.header || b.field)
          }
          return a.isFixed ? -1 : 1
        default:
          return (a.order || 0) - (b.order || 0)
      }
    })
  })

  const groupedColumns = computed(() => {
    if (!isGrouped.value) return []

    const groups: Record<string, (ColumnDef | ParameterDefinition)[]> = {}

    filteredColumns.value.forEach((col) => {
      const category = col.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(col)
    })

    return Object.entries(groups)
      .map(([category, columns]) => ({
        category,
        columns: columns.sort((a, b) => (a.order || 0) - (b.order || 0))
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  })

  const updateColumns = (newColumns: (ColumnDef | ParameterDefinition)[]) => {
    columns.value = newColumns.map((col, index) => ({
      ...col,
      order: col.order ?? index,
      visible: col.visible ?? true
    }))
  }

  watch(
    () => initialColumns,
    (newColumns) => {
      if (newColumns) {
        updateColumns(newColumns)
      }
    },
    { deep: true }
  )

  return {
    columns,
    dragOverIndex,
    filteredColumns,
    groupedColumns,
    updateColumns
  }
}
