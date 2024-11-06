// useColumnPersistence.ts

import { gql, useMutation, useQuery } from '@vue/apollo-composable'
import type { ColumnDef } from '../types'

// This mutation matches the schema - no selections on the Boolean return type
const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings($input: JSONObject!) {
    userSettingsUpdate(input: $input)
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
  } = useMutation(UPDATE_USER_SETTINGS)

  const {
    result: userSettings,
    loading: loadLoading,
    error: loadError,
    refetch
  } = useQuery(GET_USER_SETTINGS)

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
  ) => {
    try {
      console.log('Saving table settings:', { tableId, settings })

      // Get current settings
      const currentSettings = userSettings.value?.activeUser?.userSettings || {}
      console.log('Current settings before save:', currentSettings) // Added log

      // Create updated settings object
      const updatedSettings = {
        ...currentSettings,
        namedTables: {
          ...currentSettings.namedTables,
          [tableId]: {
            id: tableId,
            name: settings.name,
            parentColumns: settings.parentColumns,
            childColumns: settings.childColumns,
            categoryFilters: settings.categoryFilters
          }
        }
      }
      console.log('Updated settings being saved:', updatedSettings) // Added log

      // Save settings
      const response = await updateSettings({
        variables: {
          input: updatedSettings
        }
      })
      console.log('GraphQL mutation response:', response) // Added log

      // Refetch to get updated data
      const refetchResult = await refetch()
      console.log('Refetch result:', refetchResult) // Added log

      // Return the updated table settings
      return updatedSettings.namedTables[tableId]
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw error
    }
  }

  // Helper to get current settings for a table
  const getTableSettings = (tableId: string) => {
    return userSettings.value?.activeUser?.userSettings?.namedTables?.[tableId]
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
