import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type { UserSettings } from '~/composables/core/types'
import { useNuxtApp } from '#app'

interface GetUserSettingsResponse {
  activeUser: {
    userSettings: UserSettings | null
    id: string
  }
}

interface UpdateUserSettingsResponse {
  userSettingsUpdate: boolean
}

interface UpdateUserSettingsVariables {
  settings: Record<string, unknown>
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

export function useSettingsGraphQL() {
  const nuxtApp = useNuxtApp()

  // Get the Apollo client instance from Nuxt app
  const apolloClient = nuxtApp.$apollo?.default
  if (!apolloClient) {
    debug.error(
      DebugCategories.ERROR,
      'Apollo client not found in Nuxt app - settings operations will fail'
    )
    throw new Error('Apollo client not initialized in Nuxt app')
  }

  // Provide the Apollo client for all operations in this composable
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

  async function fetchSettings(): Promise<UserSettings | null> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Fetching settings from GraphQL')

      // Ensure we're in a valid Apollo context
      const response = await nuxtApp.runWithContext(() => refetch())

      if (!response?.data) {
        debug.warn(DebugCategories.INITIALIZATION, 'No data in GraphQL response')
        return null
      }

      const settings = response.data.activeUser?.userSettings

      debug.log(DebugCategories.INITIALIZATION, 'Settings fetched from GraphQL', {
        hasSettings: !!settings,
        settings,
        userId: response.data.activeUser?.id
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Settings fetch complete')
      return settings
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch settings', err)
      throw new Error('Failed to fetch settings')
    }
  }

  async function updateSettings(settings: UserSettings): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Updating settings via GraphQL')

      debug.log(DebugCategories.STATE, 'Settings update payload', {
        settings,
        namedTablesCount: Object.keys(settings.namedTables || {}).length
      })

      // Convert settings to a plain object for GraphQL
      const settingsPayload: UpdateUserSettingsVariables = {
        settings: JSON.parse(JSON.stringify(settings)) as Record<string, unknown>
      }

      // Run the mutation within the Nuxt app context
      const result = await nuxtApp.runWithContext(() =>
        updateSettingsMutation(settingsPayload)
      )

      if (!result?.data) {
        debug.warn(DebugCategories.STATE, 'No data in mutation response')
        return false
      }

      const success = result.data.userSettingsUpdate

      debug.log(DebugCategories.STATE, 'Settings update result', {
        success,
        settings
      })

      if (!success) {
        throw new Error('Settings update returned false')
      }

      debug.completeState(DebugCategories.STATE, 'Settings update complete')
      return true
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update settings', err)
      throw new Error(err instanceof Error ? err.message : 'Failed to update settings')
    }
  }

  return {
    result,
    queryLoading,
    fetchSettings,
    updateSettings
  }
}
