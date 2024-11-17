import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'
import { useSettingsGraphQL } from './useSettingsGraphQL'
import { useUpdateQueue } from './useUpdateQueue'
import { isUserSettings } from './types/scheduleTypes'
import type { UserSettings } from './types/scheduleTypes'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'

export function useSettingsState() {
  // Initialize with default table
  const settings = ref<UserSettings>({
    namedTables: {
      [defaultTable.id]: defaultTable
    }
  })
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)

  const { result, queryLoading, fetchSettings, updateSettings } = useSettingsGraphQL()
  const { queueUpdate } = useUpdateQueue()

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
          'No settings in update, using default table'
        )
        settings.value = {
          namedTables: {
            [defaultTable.id]: defaultTable
          }
        }
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

        // If no tables exist, use default table
        if (
          !parsedSettings.namedTables ||
          Object.keys(parsedSettings.namedTables).length === 0
        ) {
          settings.value = {
            ...parsedSettings,
            namedTables: {
              [defaultTable.id]: defaultTable
            }
          }
        } else {
          settings.value = {
            ...parsedSettings,
            namedTables: parsedSettings.namedTables
          }
        }

        debug.log(DebugCategories.INITIALIZATION, 'Settings updated', {
          namedTablesCount: Object.keys(settings.value.namedTables).length,
          namedTables: settings.value.namedTables
        })
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process settings update', err)
      }
    },
    { deep: true }
  )

  async function loadSettings(): Promise<void> {
    try {
      loading.value = true
      error.value = null

      // Try to fetch settings, but don't block on failure
      try {
        const rawSettings = await fetchSettings()
        if (rawSettings && isUserSettings(rawSettings)) {
          // If no tables exist, use default table
          if (
            !rawSettings.namedTables ||
            Object.keys(rawSettings.namedTables).length === 0
          ) {
            settings.value = {
              ...rawSettings,
              namedTables: {
                [defaultTable.id]: defaultTable
              }
            }
          } else {
            settings.value = {
              ...rawSettings,
              namedTables: rawSettings.namedTables
            }
          }

          debug.log(DebugCategories.INITIALIZATION, 'Settings loaded', {
            namedTablesCount: Object.keys(settings.value.namedTables).length,
            namedTables: settings.value.namedTables
          })
        } else {
          // Use default table if no valid settings
          settings.value = {
            namedTables: {
              [defaultTable.id]: defaultTable
            }
          }
          debug.log(DebugCategories.INITIALIZATION, 'Using default table settings')
        }
      } catch (err) {
        debug.warn(
          DebugCategories.INITIALIZATION,
          'Failed to fetch settings, using default table',
          err
        )
        settings.value = {
          namedTables: {
            [defaultTable.id]: defaultTable
          }
        }
      }
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

        // Update local state immediately
        settings.value = newSettings

        // Try to persist settings, but don't block on failure
        try {
          await updateSettings(newSettings)
        } catch (err) {
          debug.warn(DebugCategories.STATE, 'Failed to persist settings', err)
        }

        return true
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
    isUpdating,
    lastUpdateTime,
    loadSettings,
    saveSettings
  }
}
