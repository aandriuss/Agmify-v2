import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'
import type { NamedTableConfig, UserSettings } from './types'
import { useSettingsGraphQL } from './useSettingsGraphQL'
import { useTableOperations } from './useTableOperations'
import { parseSettings, validateAndNormalizeSettings } from './useSettingsValidation'

export function useSettings() {
  const settings = ref<UserSettings>({ namedTables: {} })
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)

  const { result, queryLoading, fetchSettings, updateSettings } = useSettingsGraphQL()

  const tableOperations = useTableOperations({
    updateNamedTable: async (id, config) => {
      const currentSettings = settings.value
      const existingTable = currentSettings.namedTables[id]

      if (!existingTable) {
        throw new Error('Table not found')
      }

      // Create updated table config
      const updatedTable: NamedTableConfig = {
        ...existingTable,
        ...config,
        id,
        lastUpdateTimestamp: Date.now()
      }

      // Create updated settings
      const updatedSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [id]: updatedTable
        }
      }

      // Update local state first
      settings.value = updatedSettings

      // Record update time
      lastUpdateTime.value = Date.now()

      // Send to server
      const success = await updateSettings(updatedSettings)
      if (!success) {
        throw new Error('Failed to save table updates')
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

      const updatedSettings: UserSettings = {
        ...settings.value,
        namedTables: {
          ...settings.value.namedTables,
          [tableId]: newTable
        }
      }

      // Update local state first
      settings.value = updatedSettings

      // Record update time
      lastUpdateTime.value = Date.now()

      // Send to server
      const success = await updateSettings(updatedSettings)
      if (!success) {
        throw new Error('Failed to create table')
      }

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
        const parsedSettings = parseSettings(newSettings)
        const validatedSettings = validateAndNormalizeSettings(parsedSettings)
        settings.value = validatedSettings

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
      if (!rawSettings) {
        settings.value = { namedTables: {} }
        return
      }

      const parsedSettings = parseSettings(rawSettings)
      const validatedSettings = validateAndNormalizeSettings(parsedSettings)
      settings.value = validatedSettings

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

  return {
    settings,
    loading: loading.value || queryLoading.value,
    error,
    loadSettings,
    ...tableOperations
  }
}
