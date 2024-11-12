import { useMutation, useQuery } from '@vue/apollo-composable'
import { gql } from 'graphql-tag'
import { debug, DebugCategories } from '~/components/viewer/schedules/utils/debug'
import type { UserSettings } from './types'

interface GetUserSettingsResponse {
  activeUser: {
    userSettings: UserSettings | null
    id: string
  }
}

interface UpdateUserSettingsResponse {
  userSettingsUpdate: boolean
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
  const { mutate: updateSettingsMutation } =
    useMutation<UpdateUserSettingsResponse>(UPDATE_USER_SETTINGS)

  const {
    result,
    loading: queryLoading,
    refetch
  } = useQuery<GetUserSettingsResponse>(GET_USER_SETTINGS, null, {
    fetchPolicy: 'network-only'
  })

  async function fetchSettings(): Promise<UserSettings | null> {
    try {
      const response = await refetch()

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

      return settings
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch settings', err)
      throw new Error('Failed to fetch settings')
    }
  }

  async function updateSettings(settings: UserSettings): Promise<boolean> {
    try {
      const result = await updateSettingsMutation({
        settings
      })

      if (!result?.data) {
        debug.warn(DebugCategories.STATE, 'No data in mutation response')
        return false
      }

      const success = result.data.userSettingsUpdate

      debug.log(DebugCategories.STATE, 'Settings update result', {
        success,
        settings
      })

      return success
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update settings', err)
      throw new Error('Failed to update settings')
    }
  }

  return {
    result,
    queryLoading,
    fetchSettings,
    updateSettings
  }
}
