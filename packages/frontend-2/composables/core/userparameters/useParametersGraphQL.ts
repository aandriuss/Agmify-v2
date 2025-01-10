import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import { ParameterError } from './errors'
import type { AvailableUserParameter } from '~/composables/core/types'

// GraphQL Operations
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
    throw new ParameterError('Apollo client not initialized')
  }

  provideApolloClient(apolloClient)

  // Initialize GraphQL operations
  const { mutate: updateParametersMutation } = useMutation<
    { userParametersUpdate: boolean },
    { parameters: Record<string, AvailableUserParameter> }
  >(UPDATE_USER_PARAMETERS)

  const {
    result: queryResult,
    loading: queryLoading,
    refetch
  } = useQuery<{ activeUser: { parameters: Record<string, AvailableUserParameter> } }>(
    GET_USER_PARAMETERS,
    null,
    {
      fetchPolicy: 'cache-and-network'
    }
  )

  /**
   * Fetch parameters from PostgreSQL
   */
  async function fetchParameters(): Promise<Record<string, AvailableUserParameter>> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching parameters')

      const response = await nuxtApp.runWithContext(() => refetch())
      const parameters = response?.data?.activeUser?.parameters || {}

      debug.log(DebugCategories.INITIALIZATION, 'Parameters fetched', {
        count: Object.keys(parameters).length
      })

      return parameters
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch parameters:', err)
      throw new ParameterError(
        err instanceof Error ? err.message : 'Failed to fetch parameters'
      )
    }
  }

  /**
   * Create parameter in PostgreSQL
   */
  async function createParameter(
    parameter: AvailableUserParameter
  ): Promise<AvailableUserParameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Creating parameter')

      // Get current parameters
      const currentParameters = await fetchParameters()

      // Add new parameter
      const updatedParameters = {
        ...currentParameters,
        [parameter.id]: parameter
      }

      // Save to PostgreSQL
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: updatedParameters
        })
      )

      if (!result?.data?.userParametersUpdate) {
        throw new ParameterError('Failed to create parameter')
      }

      return parameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to create parameter:', err)
      throw new ParameterError(
        err instanceof Error ? err.message : 'Failed to create parameter'
      )
    }
  }

  /**
   * Update parameter in PostgreSQL
   */
  async function updateParameter(
    id: string,
    parameter: AvailableUserParameter
  ): Promise<AvailableUserParameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameter')

      // Get current parameters
      const currentParameters = await fetchParameters()

      // Update parameter
      const updatedParameters = {
        ...currentParameters,
        [id]: parameter
      }

      // Save to PostgreSQL
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: updatedParameters
        })
      )

      if (!result?.data?.userParametersUpdate) {
        throw new ParameterError('Failed to update parameter')
      }

      return parameter
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update parameter:', err)
      throw new ParameterError(
        err instanceof Error ? err.message : 'Failed to update parameter'
      )
    }
  }

  /**
   * Delete parameter from PostgreSQL
   */
  async function deleteParameter(id: string): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Deleting parameter')

      // Get current parameters
      const currentParameters = await fetchParameters()

      // Remove parameter
      const { [id]: removed, ...remainingParameters } = currentParameters

      // Save to PostgreSQL
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: remainingParameters
        })
      )

      if (!result?.data?.userParametersUpdate) {
        throw new ParameterError('Failed to delete parameter')
      }

      return true
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to delete parameter:', err)
      throw new ParameterError(
        err instanceof Error ? err.message : 'Failed to delete parameter'
      )
    }
  }

  return {
    result: queryResult,
    loading: queryLoading,
    fetchParameters,
    createParameter,
    updateParameter,
    deleteParameter
  }
}
