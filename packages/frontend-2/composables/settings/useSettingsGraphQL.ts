import { useMutation, useQuery, provideApolloClient } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import type {
  UserSettings,
  NamedTableConfig,
  CustomParameter
} from '~/composables/core/types'
import { useNuxtApp } from '#app'

interface GetUserSettingsResponse {
  activeUser: {
    userSettings: UserSettings | null
    userTables: Record<string, NamedTableConfig> | null
    userParameters: { customParameters: CustomParameter[] } | null
    id: string
  }
}

interface UpdateUserSettingsResponse {
  userSettingsUpdate: boolean
  userTablesUpdate: boolean
  userParametersUpdate: boolean
}

interface UpdateUserSettingsVariables {
  settings: {
    controlWidth?: number
  }
  tables: Record<string, NamedTableConfig>
  parameters: {
    customParameters: CustomParameter[]
  }
}

const GET_USER_SETTINGS = gql`
  query GetUserSettings {
    activeUser {
      userSettings
      userTables
      userParameters
      id
    }
  }
`

const UPDATE_USER_SETTINGS = gql`
  mutation UpdateUserSettings(
    $settings: JSONObject!
    $tables: JSONObject!
    $parameters: JSONObject!
  ) {
    userSettingsUpdate(settings: $settings)
    userTablesUpdate(tables: $tables)
    userParametersUpdate(parameters: $parameters)
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

      const { userSettings, userTables, userParameters } =
        response.data.activeUser || {}

      debug.log(DebugCategories.INITIALIZATION, 'Settings fetched from GraphQL', {
        hasSettings: !!userSettings,
        hasTables: !!userTables,
        hasParameters: !!userParameters,
        userId: response.data.activeUser?.id
      })

      // Combine the settings
      const settings: UserSettings = {
        controlWidth: userSettings?.controlWidth,
        namedTables: userTables || {},
        customParameters: userParameters?.customParameters || []
      }

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

      // Split settings into their respective fields
      const settingsPayload: UpdateUserSettingsVariables = {
        settings: {
          controlWidth: settings.controlWidth
        },
        tables: settings.namedTables || {},
        parameters: {
          customParameters: settings.customParameters || []
        }
      }

      debug.log(DebugCategories.STATE, 'Settings update payload', {
        settings: settingsPayload.settings,
        namedTablesCount: Object.keys(settingsPayload.tables).length,
        parametersCount: settingsPayload.parameters.customParameters.length
      })

      // Run the mutation within the Nuxt app context
      const result = await nuxtApp.runWithContext(() =>
        updateSettingsMutation(settingsPayload)
      )

      if (!result?.data) {
        debug.warn(DebugCategories.STATE, 'No data in mutation response')
        return false
      }

      const success =
        result.data.userSettingsUpdate &&
        result.data.userTablesUpdate &&
        result.data.userParametersUpdate

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
