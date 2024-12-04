import { useMutation, useQuery } from '@vue/apollo-composable'
import { ref } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { GET_TABLES, UPDATE_TABLES } from '../core/graphql/tables'
import type { NamedTableConfig } from '~/composables/core/types'
import type {
  UserResponse,
  UserTablesUpdateResponse
} from '../core/types/graphql/responses'

export function useTablesGraphQL() {
  const initialTables = ref<Record<string, NamedTableConfig> | null>(null)

  // Query for tables
  const {
    result,
    loading: tablesLoading,
    error: tablesError,
    refetch: refetchTables
  } = useQuery<UserResponse>(GET_TABLES)

  // Update tables mutation
  const {
    mutate: updateTablesMutation,
    loading: updateLoading,
    error: updateError
  } = useMutation<UserTablesUpdateResponse>(UPDATE_TABLES)

  // Fetch tables
  async function fetchTables(): Promise<Record<string, NamedTableConfig> | null> {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Fetching tables')
      const response = await refetchTables()

      if (!response?.data?.activeUser?.tables) {
        debug.warn(DebugCategories.TABLE_UPDATES, 'No tables data returned')
        initialTables.value = null
        return null
      }

      const tables = response.data.activeUser.tables as Record<string, NamedTableConfig>
      initialTables.value = tables

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Tables fetched successfully')
      return tables
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to fetch tables', err)
      throw err
    }
  }

  // Update tables
  async function updateTables(
    tables: Record<string, NamedTableConfig>
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.TABLE_UPDATES, 'Updating tables', { tables })

      // Send tables directly without variables wrapper
      const response = await updateTablesMutation({ tables })

      const success = response?.data?.userTablesUpdate === true

      if (success) {
        initialTables.value = tables
        await refetchTables()
      }

      debug.completeState(DebugCategories.TABLE_UPDATES, 'Tables updated successfully')
      return success
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to update tables', err)
      throw err
    }
  }

  return {
    result,
    tablesLoading,
    tablesError,
    updateLoading,
    updateError,
    error: tablesError,
    fetchTables,
    updateTables
  }
}
