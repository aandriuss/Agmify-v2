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

export interface TableConfig {
  parentColumns: ColumnConfig[]
  childColumns: ColumnConfig[]
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
  tables?: Record<string, TableConfig>
  namedTables?: Record<string, NamedTableConfig>
}

export function useUserSettings(tableId?: string) {
  const parentTableConfig = ref<ColumnConfig[]>([])
  const childTableConfig = ref<ColumnConfig[]>([])
  const { mutate: updateSettingsMutation } = useMutation(UPDATE_USER_SETTINGS)
  const { result, loading } = useQuery(GET_USER_SETTINGS)

  const settings = ref<UserSettings>({ tables: {}, namedTables: {} })

  // Load settings from the query result
  watch(
    () => result.value?.activeUser?.userSettings,
    (newSettings) => {
      if (newSettings) {
        settings.value = { ...settings.value, ...newSettings }
        console.log('Loaded settings:', settings.value)
      }
    },
    { immediate: true }
  )

  const createNamedTable = async (
    name: string,
    initialConfig?: Partial<TableConfig>
  ) => {
    try {
      const newTableId = crypto.randomUUID()
      const newNamedTable = {
        id: newTableId,
        name,
        parentColumns: initialConfig?.parentColumns || [],
        childColumns: initialConfig?.childColumns || [],
        categoryFilters: {
          selectedParentCategories: [],
          selectedChildCategories: []
        }
      }

      // Add the new named table to settings
      settings.value.namedTables = {
        ...settings.value.namedTables,
        [newTableId]: newNamedTable
      }

      // Save the updated settings
      await updateSettingsMutation({
        settings: settings.value
      })

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
      if (!settings.value.namedTables || !settings.value.namedTables[tableId]) {
        throw new Error('Table not found')
      }

      settings.value.namedTables[tableId] = {
        ...settings.value.namedTables[tableId],
        ...updates
      }

      await updateSettingsMutation({
        settings: settings.value
      })
    } catch (error) {
      console.error('Error updating named table:', error)
      throw error
    }
  }

  const deleteNamedTable = async (tableId: string) => {
    try {
      if (!settings.value.namedTables) return

      const { [tableId]: _, ...remainingTables } = settings.value.namedTables
      settings.value.namedTables = remainingTables

      await updateSettingsMutation({
        settings: settings.value
      })
    } catch (error) {
      console.error('Error deleting named table:', error)
      throw error
    }
  }

  const loadSettings = () => {
    if (!loading.value && result.value?.activeUser?.userSettings) {
      const settingsData = result.value.activeUser.userSettings
      settings.value = { ...settings.value, ...settingsData }
      console.log('Loaded settings data:', settings.value)
    }
  }

  const saveSettings = async (newSettings) => {
    try {
      settings.value = { ...settings.value, ...newSettings }
      const result = await updateSettingsMutation({
        settings: settings.value
      })
      console.log('Mutation result:', result)
      return result
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  // Return only necessary data and functions
  return {
    parentTableConfig,
    childTableConfig,
    settings,
    loading,
    saveSettings,
    loadSettings,
    createNamedTable,
    updateNamedTable,
    deleteNamedTable
  }
}
