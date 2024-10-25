import { ref, watch, computed } from 'vue'
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

export interface UserSettings {
  controlsWidth?: number
  tables?: {
    [tableId: string]: TableConfig
  }
}

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

export function useUserSettings(tableId?: string) {
  const parentTableConfig = ref<ColumnConfig[]>([])
  const childTableConfig = ref<ColumnConfig[]>([])
  const { mutate: updateSettingsMutation } = useMutation(UPDATE_USER_SETTINGS)
  const { result, loading } = useQuery(GET_USER_SETTINGS)

  const settings = computed(() => {
    const settingsValue = result.value?.activeUser?.userSettings
    console.log('Settings computed:', settingsValue)
    return settingsValue || {}
  })

  // Load settings
  const loadSettings = () => {
    if (!loading.value && result.value?.activeUser?.userSettings) {
      if (tableId) {
        const tableSettings = result.value.activeUser.userSettings?.tables?.[tableId]

        // Load parent columns
        const savedParentConfig = tableSettings?.parentColumns
        if (savedParentConfig && Array.isArray(savedParentConfig)) {
          parentTableConfig.value = [...savedParentConfig].sort(
            (a, b) => a.order - b.order
          )
        }

        // Load child columns
        const savedChildConfig = tableSettings?.childColumns
        if (savedChildConfig && Array.isArray(savedChildConfig)) {
          childTableConfig.value = [...savedChildConfig].sort(
            (a, b) => a.order - b.order
          )
        }
      }
    }
  }

  // Save settings with GraphQL mutation
  const saveSettings = async (newTableConfig: Partial<TableConfig>) => {
    try {
      const currentSettings = settings.value || {}

      // Prepare the new settings object with proper nesting
      const tableSettings = {
        ...currentSettings.tables?.[tableId],
        ...(newTableConfig.parentColumns
          ? { parentColumns: newTableConfig.parentColumns }
          : {}),
        ...(newTableConfig.childColumns
          ? { childColumns: newTableConfig.childColumns }
          : {})
      }

      const newSettings = {
        ...currentSettings,
        tables: {
          ...currentSettings.tables,
          [tableId]: tableSettings
        }
      }

      // Important: Pass settings as a plain object, not within variables
      const result = await updateSettingsMutation({
        settings: newSettings // Remove the variables wrapper
      })

      console.log('Save result:', result)
      return result
    } catch (error) {
      console.error('Error saving settings:', error)
      throw error
    }
  }

  // Update settings with GraphQL mutation
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    try {
      const currentSettings = settings.value || {}
      await updateSettingsMutation({
        settings: {
          // Remove the variables wrapper
          ...currentSettings,
          ...newSettings
        }
      })
    } catch (error) {
      console.error('Error updating settings:', error)
      throw error
    }
  }

  // Watch for parent columns changes
  watch(
    () => result.value?.activeUser?.userSettings?.tables?.[tableId]?.parentColumns,
    (newColumns) => {
      if (newColumns?.length > 0) {
        console.log('Updating parent tableConfig:', newColumns)
        parentTableConfig.value = [...newColumns].sort((a, b) => a.order - b.order)
      }
    },
    { immediate: true }
  )

  // Watch for child columns changes
  watch(
    () => result.value?.activeUser?.userSettings?.tables?.[tableId]?.childColumns,
    (newColumns) => {
      if (newColumns?.length > 0) {
        console.log('Updating child tableConfig:', newColumns)
        childTableConfig.value = [...newColumns].sort((a, b) => a.order - b.order)
      }
    },
    { immediate: true }
  )

  return {
    parentTableConfig,
    childTableConfig,
    settings,
    loading,
    saveSettings,
    updateSettings,
    loadSettings
  }
}
