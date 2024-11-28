import { ref, watch } from 'vue'
import { useNuxtApp } from '#app'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useSettingsGraphQL } from './useSettingsGraphQL'
import { useUpdateQueue } from './useUpdateQueue'
import { isUserSettings } from './types/scheduleTypes'
import type { UserSettings } from './types/scheduleTypes'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'

export function useSettingsState() {
  const nuxtApp = useNuxtApp()

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

  // Initialize GraphQL operations within the Nuxt app context
  const { result, queryLoading, fetchSettings, updateSettings } =
    nuxtApp.runWithContext(() => useSettingsGraphQL())
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
      debug.startState(DebugCategories.INITIALIZATION, 'Loading settings')
      loading.value = true
      error.value = null

      // Run fetchSettings within Nuxt app context
      const rawSettings = await nuxtApp.runWithContext(() => fetchSettings())
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

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Settings loaded successfully'
      )
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load settings', err)
      error.value = err instanceof Error ? err : new Error('Failed to load settings')
      // Use default table on error
      settings.value = {
        namedTables: {
          [defaultTable.id]: defaultTable
        }
      }
    } finally {
      loading.value = false
    }
  }

  async function saveSettings(newSettings: UserSettings): Promise<boolean> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Saving settings')
        loading.value = true
        error.value = null
        isUpdating.value = true

        lastUpdateTime.value = Date.now()

        if (!isUserSettings(newSettings)) {
          throw new Error('Invalid settings format')
        }

        debug.log(DebugCategories.STATE, 'Persisting settings to backend', {
          settings: newSettings,
          namedTablesCount: Object.keys(newSettings.namedTables || {}).length
        })

        settings.value = newSettings

        // Run updateSettings within Nuxt app context
        const success = await nuxtApp.runWithContext(() => updateSettings(newSettings))

        if (!success) {
          // Run fetchSettings within Nuxt app context for revert
          settings.value = (await nuxtApp.runWithContext(() => fetchSettings())) || {
            namedTables: {
              [defaultTable.id]: defaultTable
            }
          }
          throw new Error('Failed to persist settings')
        }

        debug.completeState(DebugCategories.STATE, 'Settings saved successfully')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save settings', err)
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
