import type { NamedTableConfig } from './types/scheduleTypes'
import { useTableOperations } from './useTableOperations'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

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
        debug.startState(DebugCategories.TABLE_UPDATES, 'Updating named table', {
          id,
          config
        })

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

        debug.log(DebugCategories.TABLE_UPDATES, 'Updating table in settings', {
          id,
          config: updatedTable
        })

        const updatedSettings = {
          ...currentSettings,
          namedTables: {
            ...currentSettings.namedTables,
            [id]: updatedTable
          }
        }

        const success = await saveSettings(updatedSettings)
        if (!success) {
          debug.error(DebugCategories.ERROR, 'Failed to update table', {
            id,
            config: updatedTable
          })
          throw new Error('Failed to update table')
        }

        // Force settings update
        settings.value = updatedSettings

        debug.completeState(DebugCategories.TABLE_UPDATES, 'Table update complete', {
          id,
          updatedTable
        })

        return updatedTable
      },
      createNamedTable: async (name, config) => {
        debug.startState(DebugCategories.TABLE_UPDATES, 'Creating new table', {
          name,
          config
        })

        const tableId = `table-${Date.now()}`
        const newTable: NamedTableConfig = {
          id: tableId,
          name,
          ...config,
          lastUpdateTimestamp: Date.now()
        }

        debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table in settings', {
          id: tableId,
          config: newTable
        })

        const updatedSettings = {
          ...settings.value,
          namedTables: {
            ...settings.value.namedTables,
            [tableId]: newTable
          }
        }

        const success = await saveSettings(updatedSettings)
        if (!success) {
          debug.error(DebugCategories.ERROR, 'Failed to create table', {
            name,
            config: newTable
          })
          throw new Error('Failed to create table')
        }

        // Force settings update
        settings.value = updatedSettings

        debug.completeState(DebugCategories.TABLE_UPDATES, 'Table creation complete', {
          id: tableId,
          newTable
        })

        return tableId
      }
    })

  return {
    updateTable,
    createTable,
    updateTableCategories,
    updateTableColumns,
    updateNamedTable: async (id: string, config: Partial<NamedTableConfig>) => {
      debug.log(DebugCategories.TABLE_UPDATES, 'Named table update requested', {
        id,
        config
      })
      return updateTable(id, config)
    },
    createNamedTable: async (
      name: string,
      config: Omit<NamedTableConfig, 'id' | 'name'>
    ): Promise<NamedTableConfig> => {
      debug.log(DebugCategories.TABLE_UPDATES, 'Named table creation requested', {
        name,
        config
      })
      const result = await createTable(name, config)
      return result.config
    }
  }
}
