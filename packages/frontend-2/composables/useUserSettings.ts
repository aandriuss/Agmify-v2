import { computed } from 'vue'
import { useUserSettingsState } from './settings/userSettings'
import { useTableStore } from '~/composables/core/tables/store/store'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type {
  TableSettings,
  TableCategoryFilters,
  TableColumn
} from '~/composables/core/types'
import { defaultTableConfig } from '~/composables/core/tables/config/defaults'

export function useUserSettings() {
  // User settings (controlWidth)
  const {
    state: userSettingsState,
    loading: userSettingsLoading,
    error: userSettingsError,
    loadControlWidth,
    saveControlWidth
  } = useUserSettingsState()

  // Tables
  const store = useTableStore()

  // Combined loading and error states
  const loading = computed(() => userSettingsLoading || store.isLoading.value)
  const error = computed(() => userSettingsError || store.error.value)

  // Combined settings object for backwards compatibility
  const settings = computed(() => ({
    value: {
      controlWidth: userSettingsState.value.controlWidth,
      namedTables: Object.fromEntries(store.state.value.tables) || {},
      customParameters: [] // Parameters will be handled separately
    }
  }))

  // Load all settings
  async function loadSettings(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Loading settings')

      // Load control width first
      await loadControlWidth()

      // Then initialize tables
      await store.initialize()

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Settings loaded successfully'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load settings', err)
      throw err instanceof Error ? err : new Error('Failed to load settings')
    }
  }

  // Table operations
  async function updateTable(tableId: string, updates: Partial<TableSettings>) {
    const table = store.state.value.tables.get(tableId)
    if (!table) {
      throw new Error(`Table ${tableId} not found`)
    }
    await store.saveTable({ ...table, ...updates } as TableSettings)
  }

  async function updateTableCategories(
    tableId: string,
    categories: TableCategoryFilters
  ) {
    const table = store.state.value.tables.get(tableId)
    if (!table) {
      throw new Error(`Table ${tableId} not found`)
    }
    await store.saveTable({ ...table, categoryFilters: categories } as TableSettings)
  }

  async function updateTableColumns(
    tableId: string,
    parentColumns: TableColumn[],
    childColumns: TableColumn[]
  ) {
    const table = store.state.value.tables.get(tableId)
    if (!table) {
      throw new Error(`Table ${tableId} not found`)
    }
    await store.saveTable({
      ...table,
      parentColumns,
      childColumns
    } as TableSettings)
  }

  async function createNamedTable(config: Partial<TableSettings>) {
    const newTable: TableSettings = {
      ...defaultTableConfig,
      ...config,
      id: config.id || crypto.randomUUID()
    }
    await store.saveTable(newTable)
  }

  return {
    settings,
    loading,
    error,
    loadSettings,

    // User settings operations
    saveControlWidth,

    // Table operations
    saveTables: store.saveTable,
    updateTable,
    updateTableCategories,
    updateTableColumns,
    createNamedTable,

    // Table selection
    selectTable: (tableId: string) =>
      store.updateTable({ id: tableId } as Partial<TableSettings>),
    deselectTable: () => {
      store.state.value.currentTableId = null
      store.state.value.lastUpdated = Date.now()
    },
    selectedTableId: computed(() => store.state.value.currentTableId),
    getSelectedTable: () => store.currentTable.value,

    cleanup: () => {
      // No cleanup needed for now
    }
  }
}
