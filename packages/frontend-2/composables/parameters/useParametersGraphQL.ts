import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useNuxtApp } from '#app'
import {
  ParameterError,
  ParameterNotFoundError,
  ParameterDuplicateError,
  ParameterOperationError
} from './errors'

import type {
  AvailableBimParameter as BimParameter,
  AvailableUserParameter as UserParameter,
  AvailableParameter as Parameter
} from '~/composables/core/types/parameters/parameter-states'

import type { GQLParameter, GetParametersQueryResponse } from '~/composables/core/types'

import {
  convertToParameter,
  convertToGQLParameter
} from '~/composables/core/utils/graphql'
import { isBimParameter } from '~/composables/core/types/parameters'

// Update types that properly handle discriminated unions
type BimParameterUpdates = Partial<Omit<BimParameter, 'id' | 'kind'>>
type UserParameterUpdates = Partial<Omit<UserParameter, 'id' | 'kind'>>
type ParameterUpdates = BimParameterUpdates | UserParameterUpdates

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

const ADD_PARAMETER_TO_TABLE = gql`
  mutation AddParameterToTable($parameterId: ID!, $tableId: ID!) {
    addParameterToTable(parameterId: $parameterId, tableId: $tableId)
  }
`

const REMOVE_PARAMETER_FROM_TABLE = gql`
  mutation RemoveParameterFromTable($parameterId: ID!, $tableId: ID!) {
    removeParameterFromTable(parameterId: $parameterId, tableId: $tableId)
  }
`

// Error handling
function isGraphQLError(err: unknown): err is Error & { graphQLErrors?: unknown[] } {
  return err instanceof Error && 'graphQLErrors' in err
}

function handleOperationError(operation: string, err: unknown): never {
  debug.error(DebugCategories.ERROR, `Failed to ${operation} parameter:`, err)

  if (err instanceof ParameterError) {
    throw err
  }

  const message =
    isGraphQLError(err) && err.graphQLErrors?.length
      ? String(err.graphQLErrors[0])
      : err instanceof Error
      ? err.message
      : 'Unknown error'

  throw new ParameterOperationError(operation, message)
}

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
    { parameters: Record<string, GQLParameter> }
  >(UPDATE_USER_PARAMETERS)

  const { mutate: addParameterToTableMutation } = useMutation<
    { addParameterToTable: boolean },
    { parameterId: string; tableId: string }
  >(ADD_PARAMETER_TO_TABLE)

  const { mutate: removeParameterFromTableMutation } = useMutation<
    { removeParameterFromTable: boolean },
    { parameterId: string; tableId: string }
  >(REMOVE_PARAMETER_FROM_TABLE)

  const {
    result: queryResult,
    loading: queryLoading,
    refetch
  } = useQuery<GetParametersQueryResponse>(GET_USER_PARAMETERS, null, {
    fetchPolicy: 'cache-and-network'
  })

  // Parameter operations
  async function fetchParameters(): Promise<Record<string, Parameter>> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching parameters')

      const response = await nuxtApp.runWithContext(() => refetch())
      const gqlParameters = response?.data?.activeUser?.parameters

      if (!gqlParameters) {
        debug.warn(DebugCategories.INITIALIZATION, 'No parameters found')
        return {}
      }

      // Convert GQL parameters to core parameters with type safety
      const parameters: Record<string, Parameter> = {}
      Object.entries(gqlParameters).forEach(([key, gqlParam]) => {
        const converted = convertToParameter(gqlParam)
        if (converted && (isBimParameter(converted) || 'group' in converted)) {
          parameters[key] = converted
        }
      })

      debug.log(DebugCategories.INITIALIZATION, 'Parameters fetched', {
        count: Object.keys(parameters).length
      })

      return parameters
    } catch (err) {
      handleOperationError('fetch', err)
    }
  }

  async function createParameter(parameter: Parameter): Promise<Parameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Creating parameter')

      // Get current parameters
      const currentParameters = await fetchParameters()

      // Prepare update
      const updatedParameters = {
        ...currentParameters,
        [parameter.id]: parameter
      }

      await updateParameters(updatedParameters)

      return parameter
    } catch (err) {
      handleOperationError('create', err)
    }
  }

  async function updateParameters(
    parameters: Record<string, Parameter>
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameters')

      // Convert parameters to GQL format with type safety
      const gqlParameters: Record<string, GQLParameter> = {}
      Object.entries(parameters).forEach(([key, param]) => {
        const converted = convertToGQLParameter(param)
        if (converted) {
          gqlParameters[key] = converted
        }
      })

      // Send update
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters: gqlParameters
        })
      )

      if (!result?.data?.userParametersUpdate) {
        throw new ParameterOperationError('update', 'Server update failed')
      }

      // After successful update, fetch latest state
      await refetch()

      return true
    } catch (err) {
      handleOperationError('update', err)
    }
  }

  async function updateParameter(
    id: string,
    updates: ParameterUpdates
  ): Promise<Parameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameter')

      // Get current state
      const currentParameters = await fetchParameters()
      const existingParameter = currentParameters[id]

      if (!existingParameter) {
        throw new ParameterNotFoundError(id)
      }

      // Type guard to ensure parameter type safety
      if (!isBimParameter(existingParameter) && !('group' in existingParameter)) {
        throw new ParameterError('Invalid parameter type')
      }

      // Check for name/group conflicts
      const groupToCheck = isBimParameter(existingParameter)
        ? (updates as BimParameterUpdates).currentGroup ||
          existingParameter.currentGroup
        : (updates as UserParameterUpdates).group || existingParameter.group

      const paramName = updates.name || existingParameter.name

      if (paramName || groupToCheck) {
        const newKey = `${groupToCheck}-${paramName}`
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
        if (newKey !== id && currentParameters[newKey]) {
          throw new ParameterDuplicateError(paramName, groupToCheck)
        }
      }

      // Type-safe parameter update
      const updatedParameter = isBimParameter(existingParameter)
        ? ({
            ...existingParameter,
            ...Object.fromEntries(
              Object.entries(updates).filter(
                ([key]) => !['group', 'equation', 'isCustom'].includes(key)
              )
            ),
            kind: 'bim' as const,
            type: existingParameter.type
          } satisfies BimParameter)
        : ({
            ...existingParameter,
            ...Object.fromEntries(
              Object.entries(updates).filter(
                ([key]) =>
                  !['sourceValue', 'fetchedGroup', 'currentGroup'].includes(key)
              )
            ),
            kind: 'user' as const,
            type: existingParameter.type
          } satisfies UserParameter)

      // Update parameters
      await updateParameters({ [id]: updatedParameter })

      return updatedParameter
    } catch (err) {
      handleOperationError('update', err)
    }
  }

  async function deleteParameter(id: string): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Deleting parameter')

      // Get current state
      const currentParameters = await fetchParameters()

      if (!currentParameters[id]) {
        throw new ParameterNotFoundError(id)
      }

      // Remove parameter
      const { [id]: removed, ...remainingParameters } = currentParameters

      // Update parameters
      await updateParameters(remainingParameters)

      return true
    } catch (err) {
      handleOperationError('delete', err)
    }
  }

  async function addParameterToTable(
    parameterId: string,
    tableId: string
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Adding parameter to table')

      const result = await nuxtApp.runWithContext(() =>
        addParameterToTableMutation({
          parameterId,
          tableId
        })
      )

      if (!result?.data?.addParameterToTable) {
        throw new ParameterOperationError('add to table', 'Server update failed')
      }

      return true
    } catch (err) {
      handleOperationError('add to table', err)
    }
  }

  async function removeParameterFromTable(
    parameterId: string,
    tableId: string
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Removing parameter from table')

      const result = await nuxtApp.runWithContext(() =>
        removeParameterFromTableMutation({
          parameterId,
          tableId
        })
      )

      if (!result?.data?.removeParameterFromTable) {
        throw new ParameterOperationError('remove from table', 'Server update failed')
      }

      return true
    } catch (err) {
      handleOperationError('remove from table', err)
    }
  }

  return {
    result: queryResult,
    loading: queryLoading,
    fetchParameters,
    updateParameters,
    createParameter,
    updateParameter,
    deleteParameter,
    addParameterToTable,
    removeParameterFromTable
  }
}
