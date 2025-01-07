import { ref, computed } from 'vue'
import type { TableColumn, TableSettings } from '~/composables/core/types'

export function useTableState() {
  // Core state
  const namedTables = ref<Record<string, TableSettings>>({})
  const activeTableId = ref<string | null>(null)
  const currentView = ref<'parent' | 'child'>('parent')
  const isDirty = ref(false)

  // Computed values
  const activeTable = computed(() =>
    activeTableId.value ? namedTables.value[activeTableId.value] : null
  )

  const activeColumns = computed(() => {
    if (!activeTable.value) return []
    return currentView.value === 'parent'
      ? activeTable.value.parentColumns
      : activeTable.value.childColumns
  })

  // State management methods
  function setActiveTable(tableId: string) {
    activeTableId.value = tableId
    isDirty.value = false
  }

  function toggleView() {
    currentView.value = currentView.value === 'parent' ? 'child' : 'parent'
  }

  function updateColumns(columns: TableColumn[]) {
    if (!activeTable.value) return

    if (currentView.value === 'parent') {
      activeTable.value.parentColumns = reorderColumns(columns)
    } else {
      activeTable.value.childColumns = reorderColumns(columns)
    }
    isDirty.value = true
  }

  // Utility function for maintaining continuous order
  function reorderColumns(columns: TableColumn[]): TableColumn[] {
    return columns.map((col, index) => ({
      ...col,
      order: index
    }))
  }

  return {
    // State
    namedTables,
    activeTableId,
    currentView,
    isDirty,

    // Computed
    activeTable,
    activeColumns,

    // Methods
    setActiveTable,
    toggleView,
    updateColumns
  }
}
