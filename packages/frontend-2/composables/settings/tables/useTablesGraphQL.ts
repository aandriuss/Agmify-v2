import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type { NamedTableConfig } from '~/composables/core/types'
import { useNuxtApp } from '#app'

interface GetTablesResponse {
  activeUser: {
    tables: Record<string, NamedTableConfig>
  }
}

interface UpdateTablesResponse {
  userTablesUpdate: boolean
}

interface UpdateTablesVariables {
  tables: Record<string, NamedTableConfig>
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

export function useTablesGraphQL() {
  const nuxtApp = useNuxtApp()

  // Get the Apollo client instance
  const apolloClient = nuxtApp.$apollo?.default
  if (!apolloClient) {
    throw new Error('Apollo client not initialized')
  }

  // Provide the Apollo client for mutations
  provideApolloClient(apolloClient)

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
    refetch
  } = useQuery<GetTablesResponse>(GET_USER_TABLES, null, {
    fetchPolicy: 'cache-and-network'
  })

  function formatTableKey(table: NamedTableConfig): string {
    // Create a key in format name_id
    const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `${sanitizedName}_${table.id}`
  }

  async function fetchTables(): Promise<Record<string, NamedTableConfig>> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching tables from GraphQL')

      // Ensure we're in a valid Apollo context
      const response = await nuxtApp.runWithContext(() => refetch())

      if (!response?.data?.activeUser?.tables) {
        debug.warn(DebugCategories.INITIALIZATION, 'No data in GraphQL response')
        return {}
      }

      const rawTables = response.data.activeUser.tables
      const tables: Record<string, NamedTableConfig> = {}

      // Process tables from the response
      Object.entries(rawTables).forEach(([_, tableData]) => {
        if (
          tableData &&
          typeof tableData === 'object' &&
          'id' in tableData &&
          'name' in tableData
        ) {
          const table = tableData as NamedTableConfig
          const key = formatTableKey(table)
          tables[key] = {
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
            selectedParameterIds: Array.isArray(table.selectedParameterIds)
              ? table.selectedParameterIds
              : [],
            description: table.description
          }
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
    tables: Record<string, NamedTableConfig>
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating tables via GraphQL')

      // Create a simple object with table IDs as keys for saving to backend
      const tablesToSave = Object.entries(tables).reduce<
        Record<string, NamedTableConfig>
      >((acc, [_, table]) => {
        const validatedTable: NamedTableConfig = {
          id: table.id,
          name: table.name,
          displayName: table.displayName || table.name,
          parentColumns: Array.isArray(table.parentColumns) ? table.parentColumns : [],
          childColumns: Array.isArray(table.childColumns) ? table.childColumns : [],
          categoryFilters: table.categoryFilters || {
            selectedParentCategories: [],
            selectedChildCategories: []
          },
          selectedParameterIds: Array.isArray(table.selectedParameterIds)
            ? table.selectedParameterIds
            : [],
          description: table.description
        }
        // Use table ID as key for backend storage
        return { ...acc, [validatedTable.id]: validatedTable }
      }, {})

      debug.log(DebugCategories.STATE, 'Tables update payload', {
        tableCount: Object.keys(tablesToSave).length
      })

      const result = await nuxtApp.runWithContext(() =>
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
}
