import { ref, watch, reactive } from 'vue'
import { useMutation, useQuery } from '@vue/apollo-composable'
import gql from 'graphql-tag'

const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings($settings: JSONObject!) {
    userSettingsUpdate(settings: $settings)
  }
`

const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    activeUser {
      userSettings
    }
  }
`

export interface ColumnConfig {
  field: string
  header: string
  width?: number
  visible: boolean
  removable?: boolean
  order: number
}

export interface NamedTableConfig {
  id: string
  name: string
  parentColumns: ColumnConfig[]
  childColumns: ColumnConfig[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
}

export interface UserSettings {
  controlsWidth?: number
  namedTables: Record<string, NamedTableConfig>
}

// This composable is used to manage user settings, such as named tables and column configurations
export function useUserSettings(defaultTableId?: string) {
  const settings = ref<UserSettings>({ namedTables: {} })
  const { mutate: updateSettingsMutation } = useMutation(UPDATE_USER_SETTINGS)
  const { result, loading, refetch } = useQuery(GET_USER_SETTINGS)

  // Modified watch effect to preserve data
  watch(
    () => result.value?.activeUser?.userSettings,
    (newSettings) => {
      if (newSettings) {
        const existingTables = settings.value?.namedTables || {}
        const incomingTables = newSettings.namedTables || {}

        // Merge tables more carefully
        const mergedTables = Object.entries(incomingTables).reduce(
          (acc, [id, table]) => {
            const existingTable = existingTables[id]
            if (existingTable) {
              // Preserve existing category filters if they exist
              acc[id] = {
                ...table,
                categoryFilters: existingTable.categoryFilters || table.categoryFilters
              }
            } else {
              acc[id] = table
            }
            return acc
          },
          {} as Record<string, NamedTableConfig>
        )

        settings.value = {
          ...newSettings,
          namedTables: mergedTables
        }
      }
    },
    { deep: true }
  )

  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      // Get the latest data from the database first
      const currentData = await refetch()
      const dbSettings = currentData?.data?.activeUser?.userSettings || {
        namedTables: {}
      }

      // Merge the database data with new settings
      const updatedSettings = {
        ...dbSettings,
        ...newSettings,
        namedTables: {
          ...(dbSettings.namedTables || {}), // Preserve existing tables from DB
          ...(settings.value?.namedTables || {}), // Preserve local tables
          ...(newSettings.namedTables || {}) // Add new tables
        }
      }

      // Save merged data
      await updateSettingsMutation({
        settings: updatedSettings
      })

      // Update local state
      settings.value = updatedSettings
      console.log('Settings saved with preserved data:', settings.value)
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  const createNamedTable = async (
    name: string,
    initialConfig?: Partial<NamedTableConfig>
  ) => {
    try {
      // Get current data from DB
      const currentData = await refetch()
      const dbSettings = currentData?.data?.activeUser?.userSettings || {
        namedTables: {}
      }

      const newTableId = crypto.randomUUID()
      const newNamedTable: NamedTableConfig = {
        id: newTableId,
        name,
        parentColumns: initialConfig?.parentColumns || [],
        childColumns: initialConfig?.childColumns || [],
        categoryFilters: {
          selectedParentCategories: [],
          selectedChildCategories: []
        }
      }

      // Merge with existing data
      const updatedSettings = {
        ...dbSettings,
        namedTables: {
          ...(dbSettings.namedTables || {}), // Keep existing DB tables
          ...(settings.value?.namedTables || {}), // Keep local tables
          [newTableId]: newNamedTable // Add new table
        }
      }

      await updateSettingsMutation({
        settings: updatedSettings
      })

      settings.value = updatedSettings
      return newTableId
    } catch (error) {
      console.error('Error creating named table:', error)
      throw error
    }
  }

  const updateNamedTable = async (
    tableId: string,
    updates: Partial<NamedTableConfig>
  ) => {
    try {
      // Get current data from DB
      const currentData = await refetch()
      const dbSettings = currentData?.data?.activeUser?.userSettings || {
        namedTables: {}
      }

      if (
        !dbSettings.namedTables?.[tableId] &&
        !settings.value.namedTables?.[tableId]
      ) {
        throw new Error('Table not found')
      }

      // Get the existing table configuration
      const existingTable =
        settings.value.namedTables?.[tableId] || dbSettings.namedTables?.[tableId]

      // Deep merge updates with existing table
      const updatedTable = {
        ...existingTable,
        ...updates,
        id: tableId, // Ensure ID is preserved
        // Ensure we're not losing column configurations
        parentColumns: updates.parentColumns || existingTable.parentColumns,
        childColumns: updates.childColumns || existingTable.childColumns,
        categoryFilters: {
          ...existingTable.categoryFilters,
          ...(updates.categoryFilters || {})
        }
      }

      // Update settings while preserving all other tables
      const updatedSettings = {
        ...dbSettings,
        namedTables: {
          ...(dbSettings.namedTables || {}),
          ...(settings.value?.namedTables || {}),
          [tableId]: updatedTable
        }
      }

      await updateSettingsMutation({
        settings: updatedSettings
      })

      // Update local state
      settings.value = updatedSettings
    } catch (error) {
      console.error('Error updating named table:', error)
      throw error
    }
  }

  const loadSettings = async () => {
    try {
      const currentData = await refetch()
      const dbSettings = currentData?.data?.activeUser?.userSettings

      if (dbSettings) {
        // Merge with existing settings
        settings.value = {
          ...dbSettings,
          namedTables: {
            ...(settings.value?.namedTables || {}), // Keep existing local tables
            ...(dbSettings.namedTables || {}) // Add DB tables
          }
        }
        console.log('Settings loaded with preserved data:', settings.value)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  return {
    settings,
    loading,
    saveSettings,
    loadSettings,
    createNamedTable,
    updateNamedTable
  }
}
