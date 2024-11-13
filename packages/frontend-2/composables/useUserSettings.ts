import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/types'

// Import composables
import { useSettingsGraphQL } from './settings/useSettingsGraphQL'
import { useUpdateQueue } from './settings/useUpdateQueue'
import { useTableOperations } from './settings/useTableOperations'

// Re-export types for backward compatibility
export interface ColumnConfig {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

export interface BaseParameter {
  field: string
  header: string
  category?: string
  color?: string
  description?: string
  removable?: boolean
  visible?: boolean
  order?: number
}

export interface CustomParameter extends BaseParameter {
  id: string
  name: string
  type: 'fixed' | 'equation'
  value?: string
  equation?: string
}

export interface NamedTableConfig {
  id: string
  name: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  customParameters?: CustomParameter[]
  lastUpdateTimestamp?: number
}

export interface UserSettings {
  controlsWidth?: number
  namedTables: Record<string, NamedTableConfig>
}

// Type guard for settings
function isUserSettings(value: unknown): value is UserSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  if (typeof settings.namedTables !== 'object' || !settings.namedTables) return false
  return true
}

export function useUserSettings() {
  const settings = ref<UserSettings>({ namedTables: {} })
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)

  const { result, queryLoading, fetchSettings, updateSettings } = useSettingsGraphQL()
  const { queueUpdate } = useUpdateQueue()

  // Initialize table operations
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

        const updatedSettings: UserSettings = {
          ...currentSettings,
          namedTables: {
            ...currentSettings.namedTables,
            [id]: updatedTable
          }
        }

        const success = await updateSettings(updatedSettings)
        if (!success) {
          throw new Error('Failed to update table')
        }

        settings.value = updatedSettings
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

        const updatedSettings: UserSettings = {
          ...settings.value,
          namedTables: {
            ...settings.value.namedTables,
            [tableId]: newTable
          }
        }

        const success = await updateSettings(updatedSettings)
        if (!success) {
          throw new Error('Failed to create table')
        }

        settings.value = updatedSettings
        return tableId
      }
    })

  // Watch for remote changes
  watch(
    () => result.value?.activeUser?.userSettings,
    (newSettings: unknown) => {
      // Skip if we're updating or if this is a response to our own update
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.value
      if (isUpdating.value || timeSinceLastUpdate < 500) {
        debug.log(
          DebugCategories.INITIALIZATION,
          'Skipping settings update during local change',
          { isUpdating: isUpdating.value, timeSinceLastUpdate }
        )
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Raw settings received', {
        hasSettings: !!newSettings,
        rawSettings: newSettings
      })

      if (!newSettings) {
        debug.warn(
          DebugCategories.INITIALIZATION,
          'No settings in update, initializing with empty state'
        )
        settings.value = { namedTables: {} }
        return
      }

      try {
        // Parse and validate settings
        const parsedSettings =
          typeof newSettings === 'string'
            ? (JSON.parse(newSettings) as unknown)
            : newSettings

        if (!isUserSettings(parsedSettings)) {
          throw new Error('Invalid settings format')
        }

        settings.value = {
          ...parsedSettings,
          namedTables: parsedSettings.namedTables || {}
        }

        debug.log(DebugCategories.INITIALIZATION, 'Settings updated', {
          namedTablesCount: Object.keys(settings.value.namedTables).length,
          namedTables: settings.value.namedTables
        })
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process settings update', err)
        settings.value = { namedTables: {} }
      }
    },
    { deep: true }
  )

  async function loadSettings(): Promise<void> {
    try {
      loading.value = true
      error.value = null

      const rawSettings = await fetchSettings()
      if (!rawSettings || !isUserSettings(rawSettings)) {
        settings.value = { namedTables: {} }
        return
      }

      settings.value = {
        ...rawSettings,
        namedTables: rawSettings.namedTables || {}
      }

      debug.log(DebugCategories.INITIALIZATION, 'Settings loaded', {
        namedTablesCount: Object.keys(settings.value.namedTables).length,
        namedTables: settings.value.namedTables
      })
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load settings')
      debug.error(DebugCategories.ERROR, 'Failed to load settings', err)
      throw error.value
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(newSettings: UserSettings): Promise<boolean> {
    return queueUpdate(async () => {
      try {
        loading.value = true
        error.value = null
        isUpdating.value = true

        // Record update time before sending to avoid race conditions
        lastUpdateTime.value = Date.now()

        const success = await updateSettings(newSettings)
        if (success) {
          settings.value = newSettings
        }
        return success
      } catch (err) {
        error.value = err instanceof Error ? err : new Error('Failed to save settings')
        throw error.value
      } finally {
        loading.value = false
        isUpdating.value = false
      }
    })
  }

  return {
    settings,
    loading: loading.value || queryLoading.value,
    error,
    loadSettings,
    saveSettings,
    updateTable,
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
      return result.config
    },
    cleanup: () => {
      // No cleanup needed for now
    }
  }
}
