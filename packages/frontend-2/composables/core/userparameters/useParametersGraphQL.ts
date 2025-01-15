import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { isGraphQLAuthError } from '~/composables/core/utils/errors'
import { ParameterError } from './errors'
import type { AvailableUserParameter } from '~/composables/core/types'
import type { GraphQLError } from 'graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: readonly GraphQLError[]
}

interface GetParametersResponse {
  parameters: Record<string, AvailableUserParameter>
}

interface UpdateParametersResponse {
  userParametersUpdate: boolean
}

const GET_USER_PARAMETERS = gql`
  query GetUserParameters {
    parameters
  }
`

const UPDATE_USER_PARAMETERS = gql`
  mutation UpdateUserParameters($parameters: JSONObject!) {
    userParametersUpdate(parameters: $parameters)
  }
`

export async function useParametersGraphQL() {
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
    } = useQuery<GetParametersResponse>(GET_USER_PARAMETERS, null, {
      fetchPolicy: 'network-only', // Always fetch from network on mount
      notifyOnNetworkStatusChange: true // Ensure we get loading states for refetch
    })

    // Ensure refetch is available and type-safe
    const refetch = (): ReturnType<typeof queryRefetch> => {
      if (!queryRefetch) {
        throw new Error('Query refetch function not available')
      }
      return queryRefetch()
    }

    async function fetchParameters(): Promise<Record<string, AvailableUserParameter>> {
      try {
        debug.startState(DebugCategories.INITIALIZATION, 'Fetching parameters')

        // Ensure we have auth and Apollo client
        await getApolloClient()

        // Try fetching up to 3 times with exponential backoff
        let lastError: Error | null = null
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const response = await runInContext(() => refetch())
            const parameters = response?.data?.parameters || {}

            debug.log(DebugCategories.INITIALIZATION, 'Parameters fetched', {
              count: Object.keys(parameters).length,
              attempt: attempt + 1
            })

            return parameters
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err))

            // If it's an auth error, try to re-initialize Apollo client
            if (isGraphQLAuthError(lastError)) {
              debug.log(DebugCategories.INITIALIZATION, 'Auth error, retrying...')
              await getApolloClient()
              continue
            }

            // For other errors, wait before retry
            if (attempt < 2) {
              const delay = Math.pow(2, attempt) * 1000 // 1s, 2s, 4s
              debug.log(DebugCategories.INITIALIZATION, `Retrying in ${delay}ms...`)
              await new Promise((resolve) => setTimeout(resolve, delay))
            }
          }
        }

        // If we get here, all attempts failed
        throw (
          lastError || new Error('Failed to fetch parameters after multiple attempts')
        )
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to fetch parameters:', err)
        throw new ParameterError(
          err instanceof Error ? err.message : 'Failed to fetch parameters'
        )
      }
    }

    async function updateParameters(
      parameters: Record<string, AvailableUserParameter>
    ): Promise<boolean> {
      try {
        debug.startState(DebugCategories.STATE, 'Updating parameters')

        // Ensure we have auth and Apollo client
        await getApolloClient()

        // Execute mutation inside runInContext
        const result = await runInContext(async () => {
          const { mutate } = useMutation(UPDATE_USER_PARAMETERS)

          try {
            const mutationResponse = await mutate({
              parameters
            })

            // Type-safe response handling
            const response =
              mutationResponse as GraphQLResponse<UpdateParametersResponse>

            // Check for GraphQL errors
            if (response.errors?.length) {
              const errorMessages = response.errors.map((e) => e.message).join(', ')
              throw new Error(`GraphQL errors: ${errorMessages}`)
            }

            // Check for successful update
            const success = response.data?.userParametersUpdate ?? false

            if (!success) {
              throw new Error('Parameters update returned false')
            }

            debug.log(DebugCategories.STATE, 'Mutation completed successfully')
            return success
          } catch (err) {
            debug.error(DebugCategories.ERROR, 'Mutation failed', err)
            throw err
          }
        })

        if (!result) {
          throw new Error('Parameters update returned false')
        }

        try {
          // Manually trigger a refetch and wait for it to complete
          const refetchResult = await refetch()
          if (!refetchResult?.data) {
            throw new Error('Refetch returned no data')
          }

          const parameters = refetchResult.data?.parameters
          debug.log(DebugCategories.STATE, 'Parameters refetched', {
            success: true,
            parameterCount: parameters ? Object.keys(parameters).length : 0,
            hasData: !!parameters
          })
        } catch (err) {
          debug.error(DebugCategories.ERROR, 'Failed to refetch parameters', err)
          // Don't throw here - the update was successful even if refetch failed
        }

        debug.completeState(DebugCategories.STATE, 'Parameters update complete')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to update parameters:', err)
        throw new ParameterError(
          err instanceof Error ? err.message : 'Failed to update parameters'
        )
      }
    }

    return {
      result,
      loading: queryLoading,
      fetchParameters,
      updateParameters
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to initialize GraphQL', err)
    throw err
  }
}
