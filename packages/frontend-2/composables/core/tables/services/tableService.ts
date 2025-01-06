import { gql } from '@apollo/client/core'
import type { useApolloClient } from '@vue/apollo-composable'
import type { TableSettings } from '../store/types'
import type {
  GetTableResponse,
  SaveTableResponse,
  DeleteTableResponse,
  SaveTableInput,
  DeleteTableInput
} from './types'
import { apiColumnToCoreColumn, coreColumnToApiColumn } from './types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useParameterStore } from '~/composables/core/parameters/store'

/**
 * Convert API response to TableSettings
 */
function toTableSettings(response: GetTableResponse['tableSettings']): TableSettings {
  try {
    const parameterStore = useParameterStore()

    // Get selected parameters
    const parentParams = parameterStore.selectedParentParameters.value
    const childParams = parameterStore.selectedChildParameters.value

    // Convert parent columns with parameters
    const parentColumns = response.config.parentColumns.map((apiColumn, index) => {
      const param = parentParams[index]
      if (!param) {
        throw new Error(`Missing parent parameter at index ${index}`)
      }
      return apiColumnToCoreColumn(apiColumn, param)
    })

    // Convert child columns with parameters
    const childColumns = response.config.childColumns.map((apiColumn, index) => {
      const param = childParams[index]
      if (!param) {
        throw new Error(`Missing child parameter at index ${index}`)
      }
      return apiColumnToCoreColumn(apiColumn, param)
    })

    const settings: TableSettings = {
      id: response.id,
      name: response.name,
      displayName: response.name,
      parentColumns,
      childColumns,
      categoryFilters: response.config.categoryFilters,
      selectedParameters: response.config.selectedParameters,
      lastUpdateTimestamp: Date.now()
    }
    return settings
  } catch (err) {
    throw new Error(
      `Failed to convert table settings: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}

/**
 * Convert TableSettings to API input
 */
function toTableInput(settings: TableSettings): SaveTableInput['input'] {
  try {
    return {
      id: settings.id,
      name: settings.name,
      config: {
        parentColumns: settings.parentColumns.map((col) => coreColumnToApiColumn(col)),
        childColumns: settings.childColumns.map((col) => coreColumnToApiColumn(col)),
        selectedParameters: settings.selectedParameters,
        categoryFilters: settings.categoryFilters
      }
    }
  } catch (err) {
    throw new Error(
      `Failed to convert table input: ${
        err instanceof Error ? err.message : String(err)
      }`
    )
  }
}

const GET_TABLE = gql`
  query GetTable($tableId: String!) {
    tableSettings(id: $tableId) {
      id
      name
      config {
        parentColumns {
          field
          header
          width
          visible
          removable
          order
        }
        childColumns {
          field
          header
          width
          visible
          removable
          order
        }
        selectedParameters {
          parent
          child
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
        parentColumns {
          field
          header
          width
          visible
          removable
          order
        }
        childColumns {
          field
          header
          width
          visible
          removable
          order
        }
        selectedParameters {
          parent
          child
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

export interface TableServiceOptions {
  apolloClient?: ReturnType<typeof useApolloClient>['client']
}

export function useTableService(options: TableServiceOptions = {}) {
  /**
   * Fetch table from PostgreSQL
   */
  async function fetchTable(tableId: string): Promise<TableSettings> {
    debug.startState(DebugCategories.TABLE_DATA, 'Fetching table', { tableId })

    try {
      if (!options.apolloClient) {
        throw new Error('Apollo client required for table operations')
      }

      const client = options.apolloClient
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
      if (!options.apolloClient) {
        throw new Error('Apollo client required for table operations')
      }

      const client = options.apolloClient
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
      if (!options.apolloClient) {
        throw new Error('Apollo client required for table operations')
      }

      const client = options.apolloClient
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
