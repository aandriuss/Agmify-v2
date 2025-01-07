import { ref, computed } from 'vue'
import type { TableSettings } from '~/composables/core/tables/store/types'
import { useTableStore } from '~/composables/core/tables/store/store'

export function useTableRegistry() {
  const tableStore = useTableStore()

  // State
  const tables = ref(new Map<string, TableSettings>())

  // Getters
  const getTable = computed(() => (id: string) => tables.value.get(id))

  // Actions
  const registerTable = async (
    id: string,
    name: string,
    initialState?: Partial<TableSettings>
  ) => {
    const defaultState: TableSettings = {
      id,
      name,
      displayName: initialState?.displayName || name,
      parentColumns: initialState?.parentColumns || [],
      childColumns: initialState?.childColumns || [],
      categoryFilters: initialState?.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameters: {
        parent: [],
        child: []
      },
      filters: [],
      lastUpdateTimestamp: Date.now()
    }

    // Create in backend
    await tableStore.updateTable({
      id,
      name: defaultState.name,
      parentColumns: defaultState.parentColumns,
      childColumns: defaultState.childColumns,
      categoryFilters: defaultState.categoryFilters,
      selectedParameters: defaultState.selectedParameters,
      lastUpdateTimestamp: Date.now()
    })

    // Update local state
    tables.value.set(id, defaultState)

    return defaultState
  }

  const updateTable = async (id: string, updates: Partial<TableSettings>) => {
    const currentState = tables.value.get(id)
    if (!currentState) {
      throw new Error(`Table not found: ${id}`)
    }

    const newState: TableSettings = {
      ...currentState,
      ...updates,
      lastUpdateTimestamp: Date.now()
    }

    // Update backend
    await tableStore.updateTable({
      id,
      name: newState.name,
      parentColumns: newState.parentColumns,
      childColumns: newState.childColumns,
      categoryFilters: newState.categoryFilters,
      selectedParameters: newState.selectedParameters,
      lastUpdateTimestamp: Date.now()
    })

    // Update local state
    tables.value.set(id, newState)

    return newState
  }

  return {
    // State
    tables,

    // Getters
    getTable,

    // Actions
    registerTable,
    updateTable
  }
}
