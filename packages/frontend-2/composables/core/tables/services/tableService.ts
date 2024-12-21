import { gql } from '@apollo/client/core'
import { useApolloClient } from '@vue/apollo-composable'
import type { TableSettings } from '../store/types'
import type {
  GetTableResponse,
  SaveTableResponse,
  DeleteTableResponse,
  SaveTableInput,
  DeleteTableInput
} from './types'
import { createTableColumns } from '~/composables/core/types/tables/table-column'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

/**
 * Convert API response to TableSettings
 */
function toTableSettings(response: GetTableResponse['tableSettings']): TableSettings {
  const parentColumns = createTableColumns(response.config.selectedParameters.parent)
  const childColumns = createTableColumns(response.config.selectedParameters.child)

  const settings: TableSettings = {
    id: response.id,
    name: response.name,
    displayName: response.name,
    parentColumns,
    childColumns,
    categoryFilters: {
      selectedParentCategories:
        response.config.categoryFilters.selectedParentCategories,
      selectedChildCategories: response.config.categoryFilters.selectedChildCategories
    },
    selectedParameters: {
      parent: response.config.selectedParameters.parent,
      child: response.config.selectedParameters.child
    },
    lastUpdateTimestamp: Date.now()
  }
  return settings
}

/**
 * Convert TableSettings to API input
 */
function toTableInput(settings: TableSettings): SaveTableInput['input'] {
  return {
    id: settings.id,
    name: settings.name,
    config: {
      selectedParameters: settings.selectedParameters,
      categoryFilters: settings.categoryFilters
    }
  }
}

const GET_TABLE = gql`
  query GetTable($tableId: String!) {
    tableSettings(id: $tableId) {
      id
      name
      config {
        selectedParameters {
          parent {
            id
            name
            kind
            type
            value
            visible
            order
            category
            description
            metadata
          }
          child {
            id
            name
            kind
            type
            value
            visible
            order
            category
            description
            metadata
          }
        }
        categoryFilters {
          selectedParentCategories
          selectedChildCategories
        }
      }
    }
  }
`

const SAVE_TABLE = gql`
  mutation SaveTable($input: UpdateNamedTableInput!) {
    updateNamedTable(input: $input) {
      id
      name
      config {
        selectedParameters {
          parent {
            id
            name
            kind
            type
            value
            visible
            order
            category
            description
            metadata
          }
          child {
            id
            name
            kind
            type
            value
            visible
            order
            category
            description
            metadata
          }
        }
        categoryFilters {
          selectedParentCategories
          selectedChildCategories
        }
      }
    }
  }
`

const DELETE_TABLE = gql`
  mutation DeleteTable($tableId: String!) {
    deleteTable(id: $tableId)
  }
`

export function useTableService() {
  const { resolveClient } = useApolloClient()

  /**
   * Fetch table from PostgreSQL
   */
  async function fetchTable(tableId: string): Promise<TableSettings> {
    debug.startState(DebugCategories.TABLE_DATA, 'Fetching table', { tableId })

    try {
      const client = resolveClient()
      const { data } = await client.query<GetTableResponse>({
        query: GET_TABLE,
        variables: { tableId }
      })

      if (!data?.tableSettings) {
        throw new Error(`No table data returned for ID: ${tableId}`)
      }

      debug.log(DebugCategories.TABLE_DATA, 'Table fetched', {
        tableId,
        data: data.tableSettings
      })

      return toTableSettings(data.tableSettings)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.TABLE_DATA, 'Failed to fetch table:', error)
      throw error
    }
  }

  /**
   * Save table to PostgreSQL
   */
  async function saveTable(settings: TableSettings): Promise<TableSettings> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Saving table', {
      tableId: settings.id,
      settings
    })

    try {
      const client = resolveClient()
      const { data } = await client.mutate<SaveTableResponse, SaveTableInput>({
        mutation: SAVE_TABLE,
        variables: { input: toTableInput(settings) }
      })

      if (!data?.updateNamedTable) {
        throw new Error(`Failed to save table: ${settings.id}`)
      }

      debug.log(DebugCategories.TABLE_UPDATES, 'Table saved', {
        tableId: settings.id,
        data: data.updateNamedTable
      })

      return toTableSettings(data.updateNamedTable)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.TABLE_UPDATES, 'Failed to save table:', error)
      throw error
    }
  }

  /**
   * Delete table from PostgreSQL
   */
  async function deleteTable(tableId: string): Promise<boolean> {
    debug.startState(DebugCategories.TABLE_UPDATES, 'Deleting table', { tableId })

    try {
      const client = resolveClient()
      const { data } = await client.mutate<DeleteTableResponse, DeleteTableInput>({
        mutation: DELETE_TABLE,
        variables: { tableId }
      })

      if (data?.deleteNamedTable === undefined) {
        throw new Error(`Failed to delete table: ${tableId}`)
      }

      debug.log(DebugCategories.TABLE_UPDATES, 'Table deleted', {
        tableId,
        success: data.deleteNamedTable
      })

      return data.deleteNamedTable
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.TABLE_UPDATES, 'Failed to delete table:', error)
      throw error
    }
  }

  return {
    fetchTable,
    saveTable,
    deleteTable
  }
}
