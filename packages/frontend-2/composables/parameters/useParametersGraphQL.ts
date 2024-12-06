import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type { UnifiedParameter } from '~/composables/core/types'
import { useNuxtApp } from '#app'

interface GetParametersResponse {
  activeUser: {
    parameters: Record<string, UnifiedParameter>
  }
}

interface UpdateParametersResponse {
  userParametersUpdate: boolean
}

interface UpdateParametersVariables {
  parameters: Record<string, UnifiedParameter>
}

const GET_USER_PARAMETERS = gql`
  query GetUserParameters {
    activeUser {
      parameters
    }
  }
`

const UPDATE_USER_PARAMETERS = gql`
  mutation UpdateUserParameters($parameters: JSONObject!) {
    userParametersUpdate(parameters: $parameters)
  }
`

export function useParametersGraphQL() {
  const nuxtApp = useNuxtApp()
  const apolloClient = nuxtApp.$apollo?.default

  if (!apolloClient) {
    throw new Error('Apollo client not initialized')
  }

  provideApolloClient(apolloClient)

  const { mutate: updateParametersMutation } = useMutation<
    UpdateParametersResponse,
    UpdateParametersVariables
  >(UPDATE_USER_PARAMETERS, {
    update: (cache, { data }) => {
      if (data?.userParametersUpdate) {
        // Only invalidate the parameters part of activeUser
        cache.evict({
          fieldName: 'parameters',
          id: cache.identify({ __typename: 'User', type: 'activeUser' })
        })
        cache.gc()
      }
    },
    refetchQueries: [{ query: GET_USER_PARAMETERS }],
    awaitRefetchQueries: true
  })

  const {
    result,
    loading: queryLoading,
    refetch
  } = useQuery<GetParametersResponse>(GET_USER_PARAMETERS, null, {
    fetchPolicy: 'cache-and-network'
  })

  async function fetchParameters(): Promise<Record<string, UnifiedParameter>> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching parameters')

      const response = await nuxtApp.runWithContext(() => refetch())

      if (!response?.data?.activeUser?.parameters) {
        debug.warn(DebugCategories.INITIALIZATION, 'No parameters found in response')
        return {}
      }

      const parameters = response.data.activeUser.parameters

      debug.log(DebugCategories.INITIALIZATION, 'Parameters fetched', {
        count: Object.keys(parameters).length,
        hasData: Object.keys(parameters).length > 0
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Parameters fetch complete')
      return parameters
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch parameters:', err)
      throw new Error('Failed to fetch parameters')
    }
  }

  async function updateParameters(
    newParameters: Record<string, UnifiedParameter>
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameters')

      // First fetch current parameters
      const currentParameters = await fetchParameters()

      // Create a new object to store merged parameters
      const mergedParameters: Record<string, UnifiedParameter> = {
        ...currentParameters
      }

      // Merge new parameters one by one
      Object.entries(newParameters).forEach(([key, parameter]) => {
        // If parameter already exists, preserve its ID and merge other properties
        if (mergedParameters[key]) {
          mergedParameters[key] = {
            ...mergedParameters[key],
            ...parameter,
            id: mergedParameters[key].id // Ensure we keep the original ID
          }
        } else {
          // If it's a new parameter, add it as is
          mergedParameters[key] = parameter
        }
      })

      debug.log(DebugCategories.STATE, 'Parameters update payload', {
        currentCount: Object.keys(currentParameters).length,
        newCount: Object.keys(newParameters).length,
        mergedCount: Object.keys(mergedParameters).length
      })

      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: mergedParameters
        })
      )

      if (!result?.data?.userParametersUpdate) {
        debug.warn(DebugCategories.STATE, 'Parameters update returned false')
        return false
      }

      // Force refetch to ensure we have latest data
      await refetch()

      debug.completeState(DebugCategories.STATE, 'Parameters update complete')
      return true
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameters:', err)
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update parameters'
      )
    }
  }

  return {
    result,
    queryLoading,
    fetchParameters,
    updateParameters
  }
}
