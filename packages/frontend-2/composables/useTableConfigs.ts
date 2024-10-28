import { ref, computed } from 'vue'
import type { UserSettings, TableConfig } from './useUserSettings'
import { useUserSettings, ColumnConfig } from './useUserSettings'

export interface NamedTableConfig extends TableConfig {
  id: string
  name: string
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

export function useTableConfigs() {
  const { settings, updateSettings } = useUserSettings()
  const selectedTableId = ref<string | null>(null)

  const namedTables = computed<Record<string, NamedTableConfig>>(
    () => settings.value?.namedTables || {}
  )

  const currentTable = computed(() =>
    selectedTableId.value ? namedTables.value[selectedTableId.value] : null
  )

  const createNamedTable = async (name: string, config?: Partial<TableConfig>) => {
    try {
      const currentSettings = settings.value || {}
      const newTableId = crypto.randomUUID()

      const newSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [newTableId]: {
            id: newTableId,
            name,
            parentColumns: config?.parentColumns || [],
            childColumns: config?.childColumns || [],
            categoryFilters: {
              selectedParentCategories: [],
              selectedChildCategories: []
            }
          }
        }
      }

      await updateSettings(newSettings)
      return newTableId
    } catch (error) {
      console.error('Error creating named table:', error)
      throw error
    }
  }

  const updateNamedTable = async (
    tableId: string,
    updates: {
      name?: string
      config?: Partial<TableConfig>
      categoryFilters?: {
        selectedParentCategories?: string[]
        selectedChildCategories?: string[]
      }
    }
  ) => {
    try {
      const currentSettings = settings.value || {}
      const currentTable = currentSettings.namedTables?.[tableId]

      if (!currentTable) {
        throw new Error('Table not found')
      }

      const updatedTable = {
        ...currentTable,
        name: updates.name || currentTable.name,
        parentColumns: updates.config?.parentColumns || currentTable.parentColumns,
        childColumns: updates.config?.childColumns || currentTable.childColumns,
        categoryFilters: {
          ...currentTable.categoryFilters,
          ...(updates.categoryFilters || {})
        }
      }

      const newSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: updatedTable
        }
      }

      await updateSettings(newSettings)
    } catch (error) {
      console.error('Error updating named table:', error)
      throw error
    }
  }

  const deleteNamedTable = async (tableId: string) => {
    try {
      const currentSettings = settings.value || {}
      const { [tableId]: _, ...remainingTables } = currentSettings.namedTables || {}

      const newSettings: UserSettings = {
        ...currentSettings,
        namedTables: remainingTables
      }

      await updateSettings(newSettings)
      if (selectedTableId.value === tableId) {
        selectedTableId.value = null
      }
    } catch (error) {
      console.error('Error deleting named table:', error)
      throw error
    }
  }

  const selectTable = (tableId: string | null) => {
    selectedTableId.value = tableId
  }

  return {
    namedTables,
    currentTable,
    selectedTableId,
    createNamedTable,
    updateNamedTable,
    deleteNamedTable,
    selectTable
  }
}
