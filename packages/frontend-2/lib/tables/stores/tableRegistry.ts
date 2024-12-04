import { defineStore } from 'pinia' // why???
import { ref, computed } from 'vue'
import type {
  TableInstanceState,
  TableTypeSettings,
  TableUpdateOperation
} from '~/composables/core/types'
import { useUserSettings } from '~/composables/useUserSettings'

export const useTableRegistry = defineStore('tableRegistry', () => {
  const { updateNamedTable, createNamedTable } = useUserSettings()

  // State
  const tables = ref(new Map<string, TableInstanceState>())
  const typeSettings = ref(new Map<string, TableTypeSettings>())
  const pendingUpdates = ref(new Map<string, TableUpdateOperation>())

  // Getters
  const getTable = computed(() => (id: string) => tables.value.get(id))
  const getTypeSettings = computed(() => (type: string) => typeSettings.value.get(type))

  // Actions
  const registerTable = async (
    id: string,
    type: string,
    initialState?: Partial<TableInstanceState>
  ) => {
    const typeConfig = typeSettings.value.get(type)
    if (!typeConfig) {
      throw new Error(`No configuration found for table type: ${type}`)
    }

    const defaultState: TableInstanceState = {
      id,
      type,
      name: initialState?.name || `New ${type} Table`,
      parentColumns: initialState?.parentColumns || [...typeConfig.defaultColumns],
      childColumns: initialState?.childColumns || [],
      categoryFilters: initialState?.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      version: 0,
      lastUpdated: Date.now()
    }

    // Create in backend
    await createNamedTable(id, {
      name: defaultState.name,
      parentColumns: defaultState.parentColumns,
      childColumns: defaultState.childColumns,
      categoryFilters: defaultState.categoryFilters
    })

    // Update local state
    tables.value.set(id, defaultState)

    return defaultState
  }

  const updateTable = async (id: string, updates: Partial<TableInstanceState>) => {
    const currentState = tables.value.get(id)
    if (!currentState) {
      throw new Error(`Table not found: ${id}`)
    }

    const newState = {
      ...currentState,
      ...updates,
      version: currentState.version + 1,
      lastUpdated: Date.now()
    }

    // Update backend
    await updateNamedTable(id, {
      name: newState.name,
      parentColumns: newState.parentColumns,
      childColumns: newState.childColumns,
      categoryFilters: newState.categoryFilters
    })

    // Update local state
    tables.value.set(id, newState)

    return newState
  }

  const registerTypeSettings = (type: string, settings: TableTypeSettings) => {
    typeSettings.value.set(type, settings)
  }

  return {
    // State
    tables,
    typeSettings,
    pendingUpdates,

    // Getters
    getTable,
    getTypeSettings,

    // Actions
    registerTable,
    updateTable,
    registerTypeSettings
  }
})
