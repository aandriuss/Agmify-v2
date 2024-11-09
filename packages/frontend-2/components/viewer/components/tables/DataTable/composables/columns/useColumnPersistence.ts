import { useMutation, useQuery } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import type { ColumnDef } from '../types'

interface UserSettings {
  namedTables: Record<string, TableSettings>
}

interface TableSettings {
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

interface UserSettingsResponse {
  activeUser: {
    userSettings: UserSettings
  }
}

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

export function useColumnSettings() {
  const {
    mutate: updateSettings,
    loading: saveLoading,
    error: saveError
  } = useMutation<boolean>(UPDATE_USER_SETTINGS)

  const {
    result: userSettings,
    loading: loadLoading,
    error: loadError,
    refetch
  } = useQuery<UserSettingsResponse>(GET_USER_SETTINGS)

  const saveTableSettings = async (
    tableId: string,
    settings: {
      name: string
      parentColumns: ColumnDef[]
      childColumns: ColumnDef[]
      categoryFilters?: {
        selectedParentCategories: string[]
        selectedChildCategories: string[]
      }
    }
  ): Promise<TableSettings> => {
    try {
      const currentSettings = userSettings.value?.activeUser?.userSettings || {
        namedTables: {}
      }

      const updatedSettings: UserSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: {
            id: tableId,
            name: settings.name,
            parentColumns: settings.parentColumns.map((col, index) => ({
              ...col,
              order: index,
              visible: col.visible ?? true,
              removable: col.removable ?? true
            })),
            childColumns: settings.childColumns.map((col, index) => ({
              ...col,
              order: index,
              visible: col.visible ?? true,
              removable: col.removable ?? true
            })),
            categoryFilters: settings.categoryFilters || {
              selectedParentCategories: [],
              selectedChildCategories: []
            },
            lastUpdateTimestamp: Date.now()
          }
        }
      }

      await updateSettings({
        variables: {
          settings: updatedSettings
        }
      })

      await refetch()

      return updatedSettings.namedTables[tableId]
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to save settings: ${error.message}`)
      }
      throw new Error('Failed to save settings')
    }
  }

  const getTableSettings = (tableId: string): TableSettings | null => {
    const settings =
      userSettings.value?.activeUser?.userSettings?.namedTables?.[tableId]
    if (!settings) return null

    return {
      ...settings,
      parentColumns: (settings.parentColumns || []).map(
        (col: ColumnDef, index: number) => ({
          ...col,
          order: col.order ?? index,
          visible: col.visible ?? true,
          removable: col.removable ?? true
        })
      ),
      childColumns: (settings.childColumns || []).map(
        (col: ColumnDef, index: number) => ({
          ...col,
          order: col.order ?? index,
          visible: col.visible ?? true,
          removable: col.removable ?? true
        })
      ),
      categoryFilters: settings.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      }
    }
  }

  return {
    saveTableSettings,
    getTableSettings,
    userSettings,
    loadLoading,
    saveLoading,
    loadError,
    saveError
  }
}
