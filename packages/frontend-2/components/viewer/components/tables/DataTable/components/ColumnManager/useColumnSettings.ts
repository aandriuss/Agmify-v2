import { gql, useMutation } from '@vue/apollo-composable'
import type { ColumnDef } from '../../composables/types'

interface ColumnSettings {
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}

const UPDATE_COLUMN_SETTINGS = gql`
  mutation UpdateColumnSettings($tableId: String!, $settings: String!) {
    updateColumnSettings(input: { tableId: $tableId, settings: $settings }) {
      tableId
      settings
      updatedAt
    }
  }
`

const GET_COLUMN_SETTINGS = gql`
  query GetColumnSettings($tableId: String!) {
    columnSettings(tableId: $tableId) {
      tableId
      settings
      updatedAt
    }
  }
`

export function useColumnSettings() {
  const {
    mutate: updateColumnSettings,
    loading,
    error
  } = useMutation(UPDATE_COLUMN_SETTINGS, {
    update: (cache, { data }) => {
      if (!data?.updateColumnSettings) return

      // Update the cache with new settings
      cache.writeQuery({
        query: GET_COLUMN_SETTINGS,
        variables: { tableId: data.updateColumnSettings.tableId },
        data: {
          columnSettings: data.updateColumnSettings
        }
      })
    }
  })

  const saveColumnSettings = async (tableId: string, settings: ColumnSettings) => {
    try {
      const result = await updateColumnSettings({
        variables: {
          tableId,
          settings: JSON.stringify(settings)
        }
      })

      return result.data?.updateColumnSettings
    } catch (error) {
      console.error('Failed to update column settings:', error)
      throw error
    }
  }

  return {
    updateColumnSettings: saveColumnSettings,
    loading,
    error
  }
}
