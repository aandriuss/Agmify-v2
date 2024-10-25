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

  // Save settings
  const saveSettings = async (newSettings: Partial<UserSettings>) => {
    const currentSettings = settings.value || {}

    // Merge the new settings with current settings
    const mergedSettings = {
      ...currentSettings,
      tables: {
        ...currentSettings.tables,
        ...(newSettings.tables || {})
      }
    }

    try {
      await updateSettingsMutation({
        settings: mergedSettings
      })
    } catch (error) {
      console.error('Error saving settings:', error)
    }
  }

  // Update any settings
  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const currentSettings = settings.value
    try {
      await updateSettingsMutation({
        settings: {
          ...currentSettings,
          ...newSettings
        }
      })
    } catch (error) {
      console.error('Error updating settings:', error)
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
    updateSettings
  }
}
