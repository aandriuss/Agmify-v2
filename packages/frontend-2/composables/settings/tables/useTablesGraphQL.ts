import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { TableSettings } from '~/composables/core/types'
import { useNuxtApp } from '#app'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isGraphQLAuthError } from '~/composables/core/utils/errors'

interface GetTablesResponse {
  activeUser: {
    tables: Record<string, TableSettings>
  }
}

interface UpdateTablesResponse {
  userTablesUpdate: boolean
}

interface UpdateTablesVariables {
  tables: Record<string, TableSettings>
}

const GET_USER_TABLES = gql`
  query GetUserTables {
    activeUser {
      tables
    }
  }
`

const UPDATE_USER_TABLES = gql`
  mutation UpdateUserTables($tables: JSONObject!) {
    userTablesUpdate(tables: $tables)
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

  // Helper to run code in Nuxt context
  async function runInContext<T>(fn: () => Promise<T> | T): Promise<T> {
    const runContext = nuxtApp?.runWithContext
    if (!runContext) {
      throw new Error('Nuxt app context not available')
    }
    return runContext(fn)
  }

  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing GraphQL client')

    // Initialize Apollo client with auth check
    const apolloClient = await getApolloClient()
    provideApolloClient(apolloClient)

    debug.completeState(DebugCategories.INITIALIZATION, 'GraphQL client initialized')

    const { mutate: updateTablesMutation } = useMutation<
      UpdateTablesResponse,
      UpdateTablesVariables
    >(UPDATE_USER_TABLES, {
      // Update the cache after mutation
      update: (cache, { data }) => {
        if (data?.userTablesUpdate) {
          // Invalidate and refetch the tables query
          cache.evict({ fieldName: 'activeUser' })
          cache.gc()
        }
      },
      // Refetch the tables query after mutation
      refetchQueries: [{ query: GET_USER_TABLES }],
      awaitRefetchQueries: true
    })

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

        if (!response?.data?.activeUser?.tables) {
          debug.warn(DebugCategories.INITIALIZATION, 'No data in GraphQL response')
          return {}
        }

        const rawTables = response.data.activeUser.tables
        const tables: Record<string, TableSettings> = {}

        // Process tables from the response
        Object.entries(rawTables).forEach(([_, tableData]) => {
          if (
            tableData &&
            typeof tableData === 'object' &&
            'id' in tableData &&
            'name' in tableData
          ) {
            const table = tableData as TableSettings
            const validatedTable: TableSettings = {
              id: table.id,
              name: table.name,
              displayName: table.displayName || table.name,
              parentColumns: Array.isArray(table.parentColumns)
                ? table.parentColumns
                : [],
              childColumns: Array.isArray(table.childColumns) ? table.childColumns : [],
              categoryFilters: table.categoryFilters || {
                selectedParentCategories: [],
                selectedChildCategories: []
              },
              selectedParameters: table.selectedParameters || {
                parent: [],
                child: []
              },
              lastUpdateTimestamp: Date.now()
            }
            // Use table ID as key for consistency
            tables[validatedTable.id] = validatedTable
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

        // Create a simple object with table IDs as keys for saving to backend
        const tablesToSave = Object.entries(tables).reduce<
          Record<string, TableSettings>
        >((acc, [_, table]) => {
          const validatedTable: TableSettings = {
            id: table.id,
            name: table.name,
            displayName: table.displayName || table.name,
            parentColumns: Array.isArray(table.parentColumns)
              ? table.parentColumns
              : [],
            childColumns: Array.isArray(table.childColumns) ? table.childColumns : [],
            categoryFilters: table.categoryFilters || {
              selectedParentCategories: [],
              selectedChildCategories: []
            },
            selectedParameters: table.selectedParameters || {
              parent: [],
              child: []
            },
            lastUpdateTimestamp: Date.now()
          }
          // Use table ID as key for backend storage
          return { ...acc, [validatedTable.id]: validatedTable }
        }, {})

        debug.log(DebugCategories.STATE, 'Tables update payload', {
          tableCount: Object.keys(tablesToSave).length,
          tableIds: Object.keys(tablesToSave)
        })

        const result = await runInContext(() =>
          updateTablesMutation({
            tables: tablesToSave
          })
        )

        if (!result?.data) {
          debug.warn(DebugCategories.STATE, 'No data in mutation response')
          return false
        }

        const success = result.data.userTablesUpdate

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
