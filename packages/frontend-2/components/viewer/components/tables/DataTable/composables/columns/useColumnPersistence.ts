import { gql, useMutation } from '@vue/apollo-composable'
import type { ColumnDef } from '../types'

const UPDATE_TABLE_SETTINGS = gql`
  mutation UpdateTableSettings($tableId: String!, $settings: TableSettings!) {
    updateTableSettings(tableId: $tableId, settings: $settings) {
      id
      name
      parentColumns
      childColumns
      categoryFilters
    }
  }
`

const GET_TABLE_SETTINGS = gql`
  query GetTableSettings($tableId: String!) {
    tableSettings(tableId: $tableId) {
      id
      name
      parentColumns
      childColumns
      categoryFilters
    }
  }
`

export function useColumnSettings() {
  const { mutate: updateSettings, loading, error } = useMutation(UPDATE_TABLE_SETTINGS)

  const saveColumnSettings = async (
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
      console.log('Saving table settings:', {
        tableId,
        settings
      })

      const result = await updateSettings({
        variables: {
          tableId,
          settings
        }
      })

      return result.data?.updateTableSettings
    } catch (error) {
      console.error('Failed to save table settings:', error)
      throw error
    }
  }

  return {
    saveSettings: saveColumnSettings,
    loading,
    error
  }
}
