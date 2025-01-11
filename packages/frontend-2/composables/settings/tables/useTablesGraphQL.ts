import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isGraphQLAuthError } from '~/composables/core/utils/errors'
import type { TableSettings } from '~/composables/core/types'
import type { GraphQLError } from 'graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: readonly GraphQLError[]
}

interface GetTablesResponse {
  activeUser: {
    tables: Record<string, unknown>
  }
}

interface UpdateTablesResponse {
  userTablesUpdate: boolean
}

interface TableSettingsEntry {
  id: string
  settings: TableSettings
}

const GET_USER_TABLES = gql`
  query GetUserTables {
    activeUser {
      tables
    }
  }
`

const UPDATE_USER_TABLES = gql`
  mutation UpdateUserTables($input: TableSettingsMapInput!) {
    userTablesUpdate(input: $input)
  }
`

export async function useTablesGraphQL() {
  const nuxtApp = useNuxtApp()

  async function getApolloClient() {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Getting Apollo client')

      const apolloClient = nuxtApp.$apollo?.default
      if (!apolloClient) {
        debug.error(DebugCategories.INITIALIZATION, 'Apollo client not initialized')
        throw new Error('Apollo client not initialized')
      }

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

  async function runInContext<T>(fn: () => Promise<T> | T): Promise<T> {
    const runContext = nuxtApp?.runWithContext
    if (!runContext) {
      throw new Error('Nuxt app context not available')
    }
    return runContext(async () => {
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

    const refetch = (): ReturnType<typeof queryRefetch> => {
      if (!queryRefetch) {
        throw new Error('Query refetch function not available')
      }
      return queryRefetch()
    }

    async function fetchTables(): Promise<Record<string, TableSettings>> {
      try {
        debug.startState(DebugCategories.INITIALIZATION, 'Fetching tables from GraphQL')

        await getApolloClient()

        const response = await runInContext(() => refetch()).catch(async (err) => {
          if (isGraphQLAuthError(err)) {
            debug.log(DebugCategories.INITIALIZATION, 'Auth error, retrying...')
            await getApolloClient()
            return refetch()
          }
          throw err
        })

        const tables = response?.data?.activeUser?.tables
        if (!tables || typeof tables !== 'object') {
          debug.warn(DebugCategories.INITIALIZATION, 'No tables in GraphQL response')
          return {}
        }

        const result = tables as Record<string, TableSettings>

        debug.log(DebugCategories.INITIALIZATION, 'Tables fetched from GraphQL', {
          hasTables: Object.keys(result).length > 0,
          tableCount: Object.keys(result).length
        })

        debug.completeState(DebugCategories.INITIALIZATION, 'Tables fetch complete')
        return result
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

        await getApolloClient()

        const result = await runInContext(async () => {
          const { mutate } = useMutation(UPDATE_USER_TABLES)

          debug.log(DebugCategories.STATE, 'Preparing tables update mutation', {
            tableCount: Object.keys(tables).length,
            tableIds: Object.keys(tables)
          })

          const tableEntries = Object.entries(tables).map(
            ([id, settings]): TableSettingsEntry => ({
              id,
              settings: {
                ...settings,
                id // Ensure id is included in settings
              }
            })
          )

          try {
            const mutationResponse = await mutate({
              input: {
                tables: tableEntries
              }
            })

            const response = mutationResponse as GraphQLResponse<UpdateTablesResponse>

            debug.log(DebugCategories.STATE, 'GraphQL Mutation Response', {
              success: !!response.data?.userTablesUpdate,
              hasData: !!response.data,
              hasErrors: !!response.errors,
              errors: response.errors,
              data: response.data
            })

            if (response.errors?.length) {
              const errorMessages = response.errors.map((e) => e.message).join(', ')
              throw new Error(`GraphQL errors: ${errorMessages}`)
            }

            const success = response.data?.userTablesUpdate ?? false

            if (!success) {
              throw new Error('Tables update returned false')
            }

            debug.log(DebugCategories.STATE, 'Mutation completed successfully')
            return success
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Mutation failed', err)
            throw err
          }
        })

        if (!result) {
          throw new Error('Tables update returned false')
        }

        try {
          const refetchResult = await refetch()
          if (!refetchResult?.data) {
            throw new Error('Refetch returned no data')
          }

          const tables = refetchResult.data.activeUser?.tables
          debug.log(DebugCategories.STATE, 'Tables refetched', {
            success: true,
            tableCount: tables ? Object.keys(tables).length : 0,
            hasData: !!tables
          })
        } catch (err) {
          debug.error(DebugCategories.ERROR, 'Failed to refetch tables', err)
        }

        debug.completeState(DebugCategories.STATE, 'Tables update complete')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update tables', {
          error: err,
          errorMessage: err instanceof Error ? err.message : 'Unknown error',
          errorStack: err instanceof Error ? err.stack : undefined
        })

        if (err && typeof err === 'object' && 'graphQLErrors' in err) {
          const graphqlErr = err as { graphQLErrors?: Array<{ message: string }> }
          if (graphqlErr.graphQLErrors?.length) {
            throw new Error(graphqlErr.graphQLErrors.map((e) => e.message).join(', '))
          }
        }

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
