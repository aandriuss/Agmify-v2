import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useNuxtApp } from '#app'

interface GetUserSettingsResponse {
  activeUser: {
    userSettings: { controlWidth?: number } | null
    id: string
  }
}

interface UpdateUserSettingsResponse {
  userSettingsUpdate: boolean
}

interface UpdateUserSettingsVariables {
  settings: {
    controlWidth: number
  }
}

const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    activeUser {
      userSettings
      id
    }
  }
`

const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings($settings: JSONObject!) {
    userSettingsUpdate(settings: $settings)
  }
`

export function useUserSettingsGraphQL() {
  const nuxtApp = useNuxtApp()

  // Get the Apollo client instance
  const apolloClient = nuxtApp.$apollo?.default
  if (!apolloClient) {
    throw new Error('Apollo client not initialized')
  }

  // Provide the Apollo client for mutations
  provideApolloClient(apolloClient)

  const { mutate: updateSettingsMutation } = useMutation<
    UpdateUserSettingsResponse,
    UpdateUserSettingsVariables
  >(UPDATE_USER_SETTINGS)

  const {
    result,
    loading: queryLoading,
    refetch
  } = useQuery<GetUserSettingsResponse>(GET_USER_SETTINGS, null, {
    fetchPolicy: 'network-only'
  })

  async function fetchControlWidth(): Promise<number | null> {
    try {
      debug.startState(
        DebugCategories.INITIALIZATION,
        'Fetching control width from GraphQL'
      )

      // Ensure we're in a valid Apollo context
      const response = await nuxtApp.runWithContext(() => refetch())

      if (!response?.data) {
        debug.warn(DebugCategories.INITIALIZATION, 'No data in GraphQL response')
        return null
      }

      const controlWidth = response.data.activeUser?.userSettings?.controlWidth

      debug.log(DebugCategories.INITIALIZATION, 'Control width fetched from GraphQL', {
        hasControlWidth: controlWidth !== undefined,
        userId: response.data.activeUser?.id
      })

      debug.completeState(
        DebugCategories.INITIALIZATION,
        'Control width fetch complete'
      )
      return controlWidth ?? null
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch control width', err)
      throw new Error('Failed to fetch control width')
    }
  }

  async function updateControlWidth(width: number): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating control width via GraphQL')

      const result = await nuxtApp.runWithContext(() =>
        updateSettingsMutation({
          settings: { controlWidth: width }
        })
      )

      if (!result?.data) {
        debug.warn(DebugCategories.STATE, 'No data in mutation response')
        return false
      }

      const success = result.data.userSettingsUpdate

      debug.log(DebugCategories.STATE, 'Control width update result', {
        success,
        width
      })

      if (!success) {
        throw new Error('Control width update returned false')
      }

      debug.completeState(DebugCategories.STATE, 'Control width update complete')
      return true
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update control width', err)
      throw new Error(
        err instanceof Error ? err.message : 'Failed to update control width'
      )
    }
  }

  return {
    result,
    queryLoading,
    fetchControlWidth,
    updateControlWidth
  }
}
