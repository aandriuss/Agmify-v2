import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { ParameterMappings } from '~/composables/core/types'
import { useNuxtApp } from '#app'

const GET_PARAMETER_MAPPINGS = gql`
  query GetParameterMappings {
    activeUser {
      parameterMappings
    }
  }
`

const UPDATE_PARAMETER_MAPPINGS = gql`
  mutation UpdateParameterMappings($mappings: JSONObject!) {
    userParameterMappingsUpdate(mappings: $mappings)
  }
`

interface GetMappingsResponse {
  activeUser: {
    parameterMappings: ParameterMappings
  }
}

interface UpdateMappingsResponse {
  userParameterMappingsUpdate: boolean
}

export function useParameterMappingsGraphQL() {
  const nuxtApp = useNuxtApp()

  const apolloClient = nuxtApp.$apollo?.default
  if (!apolloClient) {
    throw new Error('Apollo client not initialized')
  }

  provideApolloClient(apolloClient)

  const { mutate: updateMappingsMutation } = useMutation<UpdateMappingsResponse>(
    UPDATE_PARAMETER_MAPPINGS,
    {
      update: (cache, { data }) => {
        if (data?.userParameterMappingsUpdate) {
          cache.evict({
            fieldName: 'parameterMappings',
            id: cache.identify({ __typename: 'User', type: 'activeUser' })
          })
          cache.gc()
        }
      },
      refetchQueries: [{ query: GET_PARAMETER_MAPPINGS }],
      awaitRefetchQueries: true
    }
  )

  const {
    result,
    loading: queryLoading,
    refetch
  } = useQuery<GetMappingsResponse>(GET_PARAMETER_MAPPINGS, null, {
    fetchPolicy: 'cache-and-network'
  })

  async function fetchMappings(): Promise<ParameterMappings> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching parameter mappings')

      const response = await nuxtApp.runWithContext(() => refetch())

      if (!response?.data?.activeUser?.parameterMappings) {
        debug.warn(DebugCategories.INITIALIZATION, 'No mappings found')
        return {}
      }

      const mappings = response.data.activeUser.parameterMappings

      debug.log(DebugCategories.INITIALIZATION, 'Mappings fetched', {
        parameterCount: Object.keys(mappings).length
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Mappings fetch complete')
      return mappings
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch mappings:', err)
      throw new Error('Failed to fetch parameter mappings')
    }
  }

  async function updateMappings(mappings: ParameterMappings): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameter mappings')

      debug.log(DebugCategories.STATE, 'Mapping structure:', mappings) // Add this for debugging

      // Remove the variables wrapper since Apollo adds it
      const result = await nuxtApp.runWithContext(() =>
        updateMappingsMutation(
          // Pass object directly, without variables wrapper
          { mappings }
        )
      )

      if (!result?.data?.userParameterMappingsUpdate) {
        throw new Error(result?.errors?.[0]?.message || 'Failed to update mappings')
      }

      await refetch()

      debug.completeState(DebugCategories.STATE, 'Mappings update complete')
      return true
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update mappings:', err)
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update parameter mappings'
      )
    }
  }

  return {
    result,
    queryLoading,
    fetchMappings,
    updateMappings
  }
}
