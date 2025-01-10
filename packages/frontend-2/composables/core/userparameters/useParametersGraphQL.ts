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
      const rawParameters = response?.data?.activeUser?.parameters

      // Initialize empty parameters object
      const parameters: Record<string, AvailableUserParameter> = {}

      // Handle null/undefined parameters from database
      if (!rawParameters) {
        debug.log(DebugCategories.INITIALIZATION, 'No parameters in database')
        return parameters
      }

      // Validate parameters object
      if (typeof rawParameters !== 'object') {
        debug.error(DebugCategories.ERROR, 'Invalid parameters format:', rawParameters)
        return parameters
      }

      // Process each parameter
      Object.entries(rawParameters).forEach(([id, param]) => {
        if (!param || typeof param !== 'object') {
          debug.warn(DebugCategories.STATE, 'Invalid parameter:', { id, param })
          return
        }

        // Ensure required fields
        if (!id.startsWith('param_')) {
          debug.warn(DebugCategories.STATE, 'Invalid parameter ID:', id)
          return
        }

        // Ensure all required fields are present with defaults
        parameters[id] = {
          // Base fields from param
          ...param,
          // Required fields with defaults
          id, // Always use the ID from the key
          kind: 'user', // Always force user kind
          visible: param.visible ?? true, // Use param.visible if exists, otherwise true
          field: param.field || param.name?.toLowerCase().replace(/\s+/g, '_') || id, // Use field if exists, otherwise generate from name or id
          header: param.header || param.name || id, // Use header if exists, otherwise use name or id
          removable: param.removable ?? true, // Use removable if exists, otherwise true
          // Ensure these are always present
          name: param.name || id,
          type: param.type || 'fixed',
          value: param.value ?? '',
          group: param.group || 'Custom'
        } as AvailableUserParameter

        debug.log(DebugCategories.STATE, 'Processed parameter:', {
          id,
          parameter: parameters[id]
        })
      })

      debug.log(DebugCategories.INITIALIZATION, 'Parameters fetched', {
        count: Object.keys(parameters).length,
        parameters
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
    parameter: AvailableUserParameter,
    allParameters: Record<string, AvailableUserParameter>
  ): Promise<AvailableUserParameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Creating parameter')

      // Save to PostgreSQL
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: allParameters
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
    parameter: AvailableUserParameter,
    allParameters: Record<string, AvailableUserParameter>
  ): Promise<AvailableUserParameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameter')

      // Save to PostgreSQL
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: allParameters
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
  async function deleteParameter(
    id: string,
    remainingParameters: Record<string, AvailableUserParameter>
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Deleting parameter')

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
