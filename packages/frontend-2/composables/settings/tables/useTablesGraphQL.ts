import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isGraphQLAuthError } from '~/composables/core/utils/errors'
import {
  isTableData,
  transformTableData,
  transformTableToInput
} from '~/composables/core/tables/transforms/tableDataTransforms'
import type { TableSettings } from '~/composables/core/types'

// GraphQL Response Types
interface TableGraphQLData {
  id: string
  name: string
  displayName: string
  childColumns: string[]
  parentColumns: string[]
  categoryFilters: {
    selectedChildCategories: string[]
    selectedParentCategories: string[]
  }
  selectedParameterIds: string[]
}

interface GetTablesResponse {
  tableSettingsP: TableGraphQLData[]
}

interface CreateTableResponse {
  createNamedTable: TableGraphQLData
}

interface UpdateTableResponse {
  updateNamedTable: TableGraphQLData
}

const GET_USER_TABLES = gql`
  query GetUserTables {
    tableSettingsP {
      id
      name
      displayName
      childColumns
      parentColumns
      categoryFilters {
        selectedChildCategories
        selectedParentCategories
      }
      selectedParameterIds
    }
  }
`

const UPDATE_TABLE = gql`
  mutation UpdateNamedTable($id: String!, $table: TableInput!) {
    updateNamedTable(id: $id, table: $table) {
      id
      name
      displayName
      childColumns
      parentColumns
      categoryFilters {
        selectedChildCategories
        selectedParentCategories
      }
      selectedParameterIds
    }
  }
`

const CREATE_TABLE = gql`
  mutation CreateNamedTable($table: TableInput!) {
    createNamedTable(table: $table) {
      id
      name
      displayName
      childColumns
      parentColumns
      categoryFilters {
        selectedChildCategories
        selectedParentCategories
      }
      selectedParameterIds
    }
  }
`

export async function useTablesGraphQL() {
  const nuxtApp = useNuxtApp()

  // Helper to get Apollo client with auth check
  async function getApolloClient() {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Getting Apollo client')

      // Get Apollo client instance first
      const apolloClient = nuxtApp.$apollo?.default
      if (!apolloClient) {
        debug.error(DebugCategories.INITIALIZATION, 'Apollo client not initialized')
        throw new Error('Apollo client not initialized')
      }

      // Then wait for auth to be ready
      const waitForUser = useWaitForActiveUser()
      const userResult = await waitForUser()
      if (!userResult?.data?.activeUser) {
        debug.error(DebugCategories.INITIALIZATION, 'Authentication required')
        throw new Error('Authentication required')
      }

      debug.completeState(DebugCategories.INITIALIZATION, 'Apollo client ready')
      return apolloClient
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to get Apollo client', err)
      throw err
    }
  }

  // Helper to run code in Nuxt context with Apollo
  async function runInContext<T>(fn: () => Promise<T> | T): Promise<T> {
    const runContext = nuxtApp?.runWithContext
    if (!runContext) {
      throw new Error('Nuxt app context not available')
    }
    return runContext(async () => {
      // Ensure Apollo client is provided
      const apolloClient = nuxtApp.$apollo?.default
      if (!apolloClient) {
        throw new Error('Apollo client not initialized')
      }
      provideApolloClient(apolloClient)
      return fn()
    })
  }

  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing GraphQL client')

    // Initialize Apollo client with auth check
    const apolloClient = await getApolloClient()
    provideApolloClient(apolloClient)

    debug.completeState(DebugCategories.INITIALIZATION, 'GraphQL client initialized')

    const {
      result,
      loading: queryLoading,
      refetch: queryRefetch
    } = useQuery<GetTablesResponse>(GET_USER_TABLES, null, {
      fetchPolicy: 'cache-and-network'
    })

    // Ensure refetch is available and type-safe
    const refetch = (): ReturnType<typeof queryRefetch> => {
      if (!queryRefetch) {
        throw new Error('Query refetch function not available')
      }
      return queryRefetch()
    }

    async function fetchTables(): Promise<Record<string, TableSettings>> {
      try {
        debug.startState(DebugCategories.INITIALIZATION, 'Fetching tables from GraphQL')

        // Ensure we have auth and Apollo client
        await getApolloClient()

        const response = await runInContext(() => refetch()).catch(async (err) => {
          // If auth error, try to re-initialize Apollo client
          if (isGraphQLAuthError(err)) {
            debug.log(DebugCategories.INITIALIZATION, 'Auth error, retrying...')
            await getApolloClient()
            return refetch()
          }
          throw err
        })

        const data = response?.data as GetTablesResponse | undefined
        if (!data?.tableSettingsP) {
          debug.warn(DebugCategories.INITIALIZATION, 'No data in GraphQL response')
          return {}
        }

        const rawTables = data.tableSettingsP
        const tables: Record<string, TableSettings> = {}

        // Process tables from the response
        rawTables.forEach((tableData) => {
          if (isTableData(tableData)) {
            const validatedTable = transformTableData(tableData)
            tables[validatedTable.id] = validatedTable
          } else {
            debug.warn(DebugCategories.INITIALIZATION, 'Invalid table data', tableData)
          }
        })

        debug.log(DebugCategories.INITIALIZATION, 'Tables fetched from GraphQL', {
          hasTables: Object.keys(tables).length > 0,
          tableCount: Object.keys(tables).length
        })

        debug.completeState(DebugCategories.INITIALIZATION, 'Tables fetch complete')
        return tables
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to fetch tables', err)
        throw new Error('Failed to fetch tables')
      }
    }

    async function updateTables(
      tables: Record<string, TableSettings>
    ): Promise<boolean> {
      try {
        debug.startState(DebugCategories.STATE, 'Updating tables via GraphQL')

        // Ensure we have auth and Apollo client
        await getApolloClient()

        // Execute mutation inside runInContext
        const result = await runInContext(async () => {
          const table = Object.values(tables)[0]
          if (!table) {
            throw new Error('No table to save')
          }

          const tableInput = transformTableToInput(table)

          // Execute appropriate mutation
          const isNew = !table.id || table.id === 'default'
          if (isNew) {
            const { mutate } = useMutation<CreateTableResponse>(CREATE_TABLE)
            return mutate({
              table: tableInput
            })
          } else {
            const { mutate } = useMutation<UpdateTableResponse>(UPDATE_TABLE)
            return mutate({
              id: table.id,
              table: tableInput
            })
          }
        })

        const data = result?.data as
          | (CreateTableResponse | UpdateTableResponse)
          | undefined
        if (!data) {
          debug.warn(DebugCategories.STATE, 'No data in mutation response')
          return false
        }

        const success = !!(
          (data as CreateTableResponse).createNamedTable ||
          (data as UpdateTableResponse).updateNamedTable
        )

        debug.log(DebugCategories.STATE, 'Tables update result', {
          success
        })

        if (!success) {
          throw new Error('Tables update returned false')
        }

        // Manually trigger a refetch to ensure we have the latest data
        await refetch()

        debug.completeState(DebugCategories.STATE, 'Tables update complete')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update tables', err)
        throw new Error(err instanceof Error ? err.message : 'Failed to update tables')
      }
    }

    return {
      result,
      queryLoading,
      fetchTables,
      updateTables
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to initialize GraphQL', err)
    throw err
  }
}
