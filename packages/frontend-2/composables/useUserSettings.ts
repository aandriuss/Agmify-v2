import { ref, watch } from 'vue'
import { useMutation, useQuery } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/types'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'

export interface ColumnConfig {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

// Base parameter interface with required fields
interface BaseParameter {
  field: string
  header: string
  category?: string
  color?: string
  description?: string
  removable?: boolean
  visible?: boolean
  order?: number
}

// Custom parameter interface extending base parameter
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

interface GetUserSettingsResponse {
  activeUser: {
    userSettings: UserSettings | null
  }
}

interface UpdateUserSettingsResponse {
  userSettingsUpdate: boolean
}

// Update GraphQL query to get userSettings
const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    activeUser {
      userSettings
      id
    }
  }
`

const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings($settings: JSONObject!) {
    userSettingsUpdate(settings: $settings)
  }
`

interface ParsedSettings {
  namedTables?: Record<string, NamedTableConfig>
  controlsWidth?: number
}

function isValidParsedSettings(value: unknown): value is ParsedSettings {
  if (!value || typeof value !== 'object') return false
  const settings = value as Record<string, unknown>
  if (
    settings.controlsWidth !== undefined &&
    typeof settings.controlsWidth !== 'number'
  )
    return false
  if (settings.namedTables !== undefined && typeof settings.namedTables !== 'object')
    return false
  return true
}

function isJsonString(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

function parseSettings(rawSettings: unknown): ParsedSettings {
  let parsed: unknown

  if (isJsonString(rawSettings)) {
    parsed = JSON.parse(rawSettings)
  } else {
    parsed = rawSettings
  }

  if (!isValidParsedSettings(parsed)) {
    throw new Error('Invalid settings format')
  }
  return parsed
}

export function useUserSettings() {
  const settings = ref<UserSettings>({ namedTables: {} })
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)

  const { mutate: updateSettingsMutation } =
    useMutation<UpdateUserSettingsResponse>(UPDATE_USER_SETTINGS)
  const {
    result,
    loading: queryLoading,
    refetch
  } = useQuery<GetUserSettingsResponse>(GET_USER_SETTINGS, null, {
    fetchPolicy: 'network-only'
  })

  // Watch for remote changes, but only if we're not currently updating
  const stopSettingsWatch = watch(
    () => result.value?.activeUser?.userSettings,
    (newSettings: unknown) => {
      // Skip if we're updating or if this is a response to our own update
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.value
      if (isUpdating.value || timeSinceLastUpdate < 1000) {
        debug.log(
          DebugCategories.INITIALIZATION,
          'Skipping settings update during local change',
          { isUpdating: isUpdating.value, timeSinceLastUpdate }
        )
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Raw settings received', {
        hasSettings: !!newSettings,
        rawSettings: newSettings,
        resultValue: result.value
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
        debug.log(DebugCategories.INITIALIZATION, 'Settings parsed', parsedSettings)

        // Ensure namedTables exists
        const validatedSettings: UserSettings = {
          ...parsedSettings,
          namedTables: parsedSettings.namedTables || {}
        }

        settings.value = validatedSettings
        debug.log(DebugCategories.INITIALIZATION, 'Settings updated', {
          namedTablesCount: Object.keys(settings.value.namedTables).length,
          namedTables: settings.value.namedTables
        })
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to parse settings', err)
        settings.value = { namedTables: {} }
      }
    },
    { deep: true }
  )

  const updateNamedTable = async (
    tableId: string,
    updates: Partial<NamedTableConfig>
  ): Promise<NamedTableConfig> => {
    try {
      loading.value = true
      error.value = null
      isUpdating.value = true // Set flag to prevent watch from triggering

      const currentSettings = settings.value
      const existingTable = currentSettings.namedTables[tableId]

      if (!existingTable) {
        throw new Error('Table not found')
      }

      // Create updated table config
      const updatedTable: NamedTableConfig = {
        ...existingTable,
        ...updates,
        // If categoryFilters are provided, use them directly without merging
        categoryFilters: updates.categoryFilters ?? existingTable.categoryFilters,
        id: tableId,
        lastUpdateTimestamp: Date.now()
      }

      // Create updated settings without merging namedTables
      const updatedSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: updatedTable
        }
      }

      // Update local state first
      settings.value = updatedSettings

      // Record update time
      lastUpdateTime.value = Date.now()

      // Send the mutation with the updated settings
      const result = await updateSettingsMutation({
        settings: updatedSettings
      })

      if (!result?.data?.userSettingsUpdate) {
        throw new Error('Failed to save table updates')
      }

      return updatedTable
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update table')
      throw error.value
    } finally {
      loading.value = false
      // Keep isUpdating true for a short while to ensure we don't process the response
      setTimeout(() => {
        isUpdating.value = false
      }, 1000)
    }
  }

  const loadSettings = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      debug.log(DebugCategories.INITIALIZATION, 'Loading settings...')

      // Wait for settings to be populated
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for settings'))
        }, 10000)

        // Check immediately
        const currentSettings = result.value?.activeUser?.userSettings
        if (currentSettings) {
          debug.log(DebugCategories.INITIALIZATION, 'Settings found immediately', {
            rawSettings: currentSettings
          })

          try {
            const parsedSettings = parseSettings(currentSettings)

            // Ensure namedTables exists
            const validatedSettings: UserSettings = {
              ...parsedSettings,
              namedTables: parsedSettings.namedTables || {}
            }

            settings.value = validatedSettings

            debug.log(DebugCategories.INITIALIZATION, 'Settings loaded immediately', {
              namedTablesCount: Object.keys(settings.value.namedTables).length,
              namedTables: settings.value.namedTables
            })

            clearTimeout(timeout)
            resolve()
            return
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Failed to parse immediate settings', {
              error: err,
              rawSettings: currentSettings
            })
          }
        } else {
          debug.log(
            DebugCategories.INITIALIZATION,
            'No immediate settings, fetching...'
          )
        }

        // If not available immediately, refetch and wait for result
        refetch()
          .then(() => {
            const currentSettings = result.value?.activeUser?.userSettings ?? null
            if (!currentSettings) {
              debug.warn(
                DebugCategories.INITIALIZATION,
                'No settings in refetch response, initializing with empty state'
              )
              settings.value = { namedTables: {} }
              clearTimeout(timeout)
              resolve()
              return
            }

            try {
              const parsedSettings = parseSettings(currentSettings)

              // Ensure namedTables exists
              const validatedSettings: UserSettings = {
                ...parsedSettings,
                namedTables: parsedSettings.namedTables || {}
              }

              settings.value = validatedSettings

              debug.log(
                DebugCategories.INITIALIZATION,
                'Settings loaded from refetch',
                {
                  namedTablesCount: Object.keys(settings.value.namedTables).length,
                  namedTables: settings.value.namedTables
                }
              )

              clearTimeout(timeout)
              resolve()
            } catch (err) {
              debug.error(DebugCategories.ERROR, 'Failed to parse refetched settings', {
                error: err,
                rawSettings: currentSettings
              })
              settings.value = { namedTables: {} }
              clearTimeout(timeout)
              resolve()
            }
          })
          .catch((err) => {
            debug.error(DebugCategories.ERROR, 'Failed to refetch settings', err)
            reject(new Error('Failed to fetch settings'))
          })

        // Clean up on timeout
        timeout.unref?.()
      })
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load settings')
      debug.error(DebugCategories.ERROR, 'Failed to load settings', err)
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const saveSettings = async (newSettings: UserSettings): Promise<boolean> => {
    try {
      loading.value = true
      error.value = null

      // Get existing settings to preserve structure
      const currentSettings = settings.value || { namedTables: {} }

      // If only controlsWidth is being updated
      if (
        newSettings.controlsWidth !== undefined &&
        Object.keys(newSettings.namedTables).length === 0
      ) {
        const result = await updateSettingsMutation({
          settings: {
            controlsWidth: newSettings.controlsWidth,
            namedTables: currentSettings.namedTables // Preserve existing tables
          }
        })
        if (result?.data?.userSettingsUpdate) {
          settings.value = {
            ...currentSettings,
            controlsWidth: newSettings.controlsWidth
          }
          return true
        }
        return false
      }

      // If namedTables are being updated
      const updatedNamedTables = Object.entries(newSettings.namedTables).reduce(
        (acc, [id, table]) => ({
          ...acc,
          [id]: {
            id: table.id,
            name: table.name,
            parentColumns: table.parentColumns.map((col, index) => ({
              field: col.field,
              header: col.header,
              type: col.type || 'string',
              order: col.order ?? index,
              visible: col.visible ?? true,
              removable: col.removable ?? true,
              width: col.width,
              category: col.category,
              description: col.description,
              isFixed: col.isFixed
            })),
            childColumns: table.childColumns.map((col, index) => ({
              field: col.field,
              header: col.header,
              type: col.type || 'string',
              order: col.order ?? index,
              visible: col.visible ?? true,
              removable: col.removable ?? true,
              width: col.width,
              category: col.category,
              description: col.description,
              isFixed: col.isFixed
            })),
            categoryFilters: {
              selectedParentCategories:
                table.categoryFilters?.selectedParentCategories || [],
              selectedChildCategories:
                table.categoryFilters?.selectedChildCategories || []
            },
            customParameters:
              table.customParameters?.map((param) => ({
                id: param.id,
                name: param.name,
                type: param.type,
                value: param.value,
                equation: param.equation,
                field: param.name,
                header: param.name,
                category: 'Custom Parameters',
                removable: true,
                visible: true,
                order: param.order
              })) || [],
            lastUpdateTimestamp: Date.now()
          }
        }),
        {} as Record<string, NamedTableConfig>
      )

      // Create updated settings
      const updatedSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          ...updatedNamedTables
        }
      }

      // Send the mutation with the correct structure
      const result = await updateSettingsMutation({
        settings: updatedSettings
      })

      if (result?.data?.userSettingsUpdate) {
        settings.value = updatedSettings
        return true
      }
      return false
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to save settings')
      throw error.value
    } finally {
      loading.value = false
    }
  }

  const createNamedTable = async (
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ): Promise<string> => {
    try {
      loading.value = true
      error.value = null

      const tableId = `table-${Date.now()}`
      const newTable: NamedTableConfig = {
        id: tableId,
        name,
        ...config,
        lastUpdateTimestamp: Date.now()
      }

      const currentSettings = settings.value
      const updatedSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: newTable
        }
      }

      const success = await saveSettings(updatedSettings)
      if (!success) {
        throw new Error('Failed to save table settings')
      }
      return tableId
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to create table')
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
    saveSettings,
    createNamedTable,
    updateNamedTable,
    cleanup: () => {
      stopSettingsWatch()
    }
  }
}
