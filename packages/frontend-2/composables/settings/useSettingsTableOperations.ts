import type { NamedTableConfig } from './types/scheduleTypes'
import { useTableOperations } from './useTableOperations'

interface UseSettingsTableOperationsOptions {
  settings: { value: { namedTables: Record<string, NamedTableConfig> } }
  saveSettings: (settings: {
    namedTables: Record<string, NamedTableConfig>
  }) => Promise<boolean>
}

export function useSettingsTableOperations(options: UseSettingsTableOperationsOptions) {
  const { settings, saveSettings } = options

  const { updateTable, createTable, updateTableCategories, updateTableColumns } =
    useTableOperations({
      updateNamedTable: async (id, config) => {
        const currentSettings = settings.value
        const existingTable = currentSettings.namedTables[id]

        if (!existingTable) {
          throw new Error('Table not found')
        }

        const updatedTable: NamedTableConfig = {
          ...existingTable,
          ...config,
          id,
          lastUpdateTimestamp: Date.now()
        }

        const updatedSettings = {
          ...currentSettings,
          namedTables: {
            ...currentSettings.namedTables,
            [id]: updatedTable
          }
        }

        const success = await saveSettings(updatedSettings)
        if (!success) {
          throw new Error('Failed to update table')
        }

        return updatedTable
      },
      createNamedTable: async (name, config) => {
        const tableId = `table-${Date.now()}`
        const newTable: NamedTableConfig = {
          id: tableId,
          name,
          ...config,
          lastUpdateTimestamp: Date.now()
        }

        const updatedSettings = {
          ...settings.value,
          namedTables: {
            ...settings.value.namedTables,
            [tableId]: newTable
          }
        }

        const success = await saveSettings(updatedSettings)
        if (!success) {
          throw new Error('Failed to create table')
        }

        return tableId
      }
    })

  return {
    updateTable,
    createTable,
    updateTableCategories,
    updateTableColumns,
    updateNamedTable: async (id: string, config: Partial<NamedTableConfig>) => {
      return updateTable(id, config)
    },
    createNamedTable: async (
      name: string,
      config: Omit<NamedTableConfig, 'id' | 'name'>
    ): Promise<NamedTableConfig> => {
      const result = await createTable(name, config)
      return result.config // Return just the config part
    }
  }
}
