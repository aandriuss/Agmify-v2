import { ref, watch } from 'vue'
import { useMutation, useQuery } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/types'

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
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  categoryFilters: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
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

// Define mutation with explicit variable name to match server expectation
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

export function useUserSettings() {
  const settings = ref<UserSettings>({ namedTables: {} })
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const { mutate: updateSettingsMutation } =
    useMutation<UpdateUserSettingsResponse>(UPDATE_USER_SETTINGS)
  const {
    result,
    loading: queryLoading,
    refetch
  } = useQuery<GetUserSettingsResponse>(GET_USER_SETTINGS)

  // Watch for remote changes
  watch(
    () => result.value?.activeUser?.userSettings,
    (newSettings: UserSettings | null | undefined) => {
      if (!newSettings) return
      settings.value = newSettings
    },
    { deep: true }
  )

  const loadSettings = async (): Promise<void> => {
    try {
      loading.value = true
      error.value = null
      await refetch()
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load settings')
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
            controlsWidth: newSettings.controlsWidth
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
            lastUpdateTimestamp: Date.now()
          }
        }),
        {}
      )

      // Create updated settings preserving all existing data
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

  const updateNamedTable = async (
    tableId: string,
    updates: Partial<NamedTableConfig>
  ): Promise<NamedTableConfig> => {
    try {
      loading.value = true
      error.value = null

      const currentSettings = settings.value
      const existingTable = currentSettings.namedTables[tableId]

      if (!existingTable) {
        throw new Error('Table not found')
      }

      const updatedTable: NamedTableConfig = {
        ...existingTable,
        ...updates,
        id: tableId,
        lastUpdateTimestamp: Date.now()
      }

      const updatedSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: updatedTable
        }
      }

      const success = await saveSettings(updatedSettings)
      if (!success) {
        throw new Error('Failed to save table updates')
      }
      return updatedTable
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update table')
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
    updateNamedTable
  }
}
