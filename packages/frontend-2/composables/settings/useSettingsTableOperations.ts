import type { NamedTableConfig } from '~/composables/core/types'
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
          id
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

        // Generate timestamp once to use in both places
        const timestamp = Date.now()

        // Internal ID uses only timestamp
        const internalId = `table-${timestamp}`

        // Top level key includes sanitized name
        const sanitizedName = name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        const topLevelKey = `${sanitizedName}_table-${timestamp}`

        const newTable: NamedTableConfig = {
          ...config,
          id: internalId,
          name,
          displayName: config.displayName || name,
          parentColumns: config.parentColumns || [],
          childColumns: config.childColumns || [],
          categoryFilters: config.categoryFilters || {
            selectedParentCategories: [],
            selectedChildCategories: []
          },
          selectedParameterIds: config.selectedParameterIds || []
        }

        debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table in settings', {
          topLevelKey,
          internalId,
          config: newTable
        })

        const updatedSettings = {
          ...settings.value,
          namedTables: {
            ...settings.value.namedTables,
            [topLevelKey]: newTable
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
          topLevelKey,
          internalId,
          newTable
        })

        return internalId
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
