import { computed } from 'vue'
import { useTableRegistry } from '../stores/tableRegistry'
import type { TableInstanceState, ColumnDef } from '~/composables/core/types'

export function useTable(
  id: string,
  type: string,
  initialState?: Partial<TableInstanceState>
) {
  const registry = useTableRegistry()

  // Initialize table if it doesn't exist
  const initializeTable = async () => {
    if (!registry.getTable.value(id)) {
      await registry.registerTable(id, type, initialState)
    }
  }

  // Get table state
  const tableState = computed(() => registry.getTable.value(id))
  const typeSettings = computed(() => registry.getTypeSettings.value(type))

  // Column management
  const parentColumns = computed(() => tableState.value?.parentColumns || [])
  const childColumns = computed(() => tableState.value?.childColumns || [])

  // Update methods
  const updateParentColumns = async (columns: ColumnDef[]) => {
    if (!tableState.value) return

    await registry.updateTable(id, {
      parentColumns: columns
    })
  }

  const updateChildColumns = async (columns: ColumnDef[]) => {
    if (!tableState.value) return

    await registry.updateTable(id, {
      childColumns: columns
    })
  }

  const updateCategoryFilters = async (
    parentCategories: string[],
    childCategories: string[]
  ) => {
    if (!tableState.value) return

    await registry.updateTable(id, {
      categoryFilters: {
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      }
    })
  }

  return {
    // State
    tableState,
    typeSettings,

    // Columns
    parentColumns,
    childColumns,

    // Methods
    initializeTable,
    updateParentColumns,
    updateChildColumns,
    updateCategoryFilters
  }
}
