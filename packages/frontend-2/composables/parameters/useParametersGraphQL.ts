import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useNuxtApp } from '#app'
import {
  ParameterError,
  ParameterNotFoundError,
  ParameterDuplicateError,
  ParameterOperationError
} from './errors'

import type {
  UnifiedParameter,
  UserParameterType,
  UserParameter
} from '~/composables/core/types'

export enum ParameterType {
  fixed = 'fixed',
  equation = 'equation'
}

export interface Parameter extends UserParameter {
  type: UserParameterType
  id: string
  name: string
  value: string
  equation?: string
  group: string
  field: string
  header: string
  category?: string
  description?: string
  removable: boolean
  isFetched?: boolean
  visible: boolean
  metadata?: unknown
  source?: string
}

interface GetParametersResponse {
  activeUser: {
    parameters: Record<string, Parameter>
  }
}

interface UpdateParametersResponse {
  userParametersUpdate: boolean
}

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
    UpdateParametersResponse,
    { parameters: Record<string, Parameter> }
  >(UPDATE_USER_PARAMETERS)

  const {
    result: queryResult,
    loading: queryLoading,
    refetch
  } = useQuery<GetParametersResponse>(GET_USER_PARAMETERS, null, {
    fetchPolicy: 'cache-and-network'
  })

  // Parameter operations
  async function fetchParameters(): Promise<Record<string, Parameter>> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching parameters')

      const response = await nuxtApp.runWithContext(() => refetch())
      const parameters = response?.data?.activeUser?.parameters

      if (!parameters) {
        debug.warn(DebugCategories.INITIALIZATION, 'No parameters found')
        return {}
      }

      debug.log(DebugCategories.INITIALIZATION, 'Parameters fetched', {
        count: Object.keys(parameters).length
      })

      return parameters
    } catch (err) {
      handleOperationError('fetch', err)
    }
  }

  async function createParameter(parameter: UnifiedParameter): Promise<Parameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Creating parameter')

      // Get current parameters
      const currentParameters = await fetchParameters()

      // Convert to Parameter type if needed
      const parameterToSave: Parameter = {
        ...parameter,
        type: parameter.type as UserParameterType,
        isFetched: false,
        removable: true
      }

      // Prepare update
      const updatedParameters = {
        ...currentParameters,
        [parameter.id]: parameterToSave
      }

      await updateParameters(updatedParameters)

      return parameterToSave
    } catch (err) {
      handleOperationError('create', err)
    }
  }

  async function updateParameters(
    parameters: Record<string, Parameter>
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameters')

      // Send update directly without trying to merge locally
      const result = await nuxtApp.runWithContext(() =>
        updateParametersMutation({
          parameters // Server will handle the merge
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
    updates: Partial<Omit<UnifiedParameter, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Parameter> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating parameter')

      // Get current state
      const currentParameters = await fetchParameters()
      const existingParameter = currentParameters[id]

      if (!existingParameter) {
        throw new ParameterNotFoundError(id)
      }

      // Check for name/group conflicts
      if (updates.name || updates.currentGroup) {
        const newKey = `${updates.currentGroup || existingParameter.group}-${
          updates.name || existingParameter.name
        }`
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '_')
        if (newKey !== id && currentParameters[newKey]) {
          throw new ParameterDuplicateError(
            updates.name || existingParameter.name,
            updates.currentGroup || existingParameter.group
          )
        }
      }

      // Update parameter
      const updatedParameter: Parameter = {
        ...existingParameter,
        name: updates.name ?? existingParameter.name,
        type:
          updates.type === 'equation'
            ? ParameterType.equation
            : updates.type === 'fixed'
            ? ParameterType.fixed
            : existingParameter.type,
        value: updates.value?.toString() ?? existingParameter.value,
        equation:
          updates.type === 'equation'
            ? updates.value?.toString()
            : existingParameter.equation,
        group: updates.currentGroup ?? existingParameter.group,
        field: updates.field ?? existingParameter.field,
        header: updates.header ?? existingParameter.header,
        category: updates.category ?? existingParameter.category,
        description: updates.description ?? existingParameter.description,
        removable: updates.removable ?? existingParameter.removable,
        visible: updates.visible ?? existingParameter.visible,
        metadata: updates.computed?.value
          ? JSON.stringify(updates.computed.value)
          : existingParameter.metadata,
        isFetched: updates.isFetched ?? existingParameter.isFetched,
        source: updates.source ?? existingParameter.source
      }

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

  return {
    result: queryResult,
    loading: queryLoading,
    fetchParameters,
    updateParameters,
    createParameter,
    updateParameter,
    deleteParameter
  }
}
