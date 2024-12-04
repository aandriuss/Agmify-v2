import { ref } from 'vue'
import { useNuxtApp } from '#app'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useTablesGraphQL } from './useTablesGraphQL'
import { useUpdateQueue } from '../useUpdateQueue'
import type { NamedTableConfig } from '../core/types/data'

export function useTablesState() {
  const nuxtApp = useNuxtApp()

  const tables = ref<Record<string, NamedTableConfig>>({})
  const loading = ref(false)
  const error = ref<Error | null>(null)

  const tablesGraphQL = nuxtApp.runWithContext(() => useTablesGraphQL())

  if (!tablesGraphQL || tablesGraphQL instanceof Promise) {
    throw new Error('Failed to initialize tables GraphQL')
  }

  const { fetchTables, updateTables: updateTablesGQL } = tablesGraphQL

  const { queueUpdate } = useUpdateQueue()

  async function loadTables(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
      loading.value = true
      error.value = null

      const tablesData = await fetchTables()

      if (tablesData) {
        tables.value = tablesData as Record<string, NamedTableConfig>
      } else {
        tables.value = {}
      }

      debug.completeState(DebugCategories.INITIALIZATION, 'Tables loaded successfully')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load tables', err)
      error.value = err instanceof Error ? err : new Error('Failed to load tables')
    } finally {
      loading.value = false
    }
  }

  async function saveTables(
    newTables: Record<string, NamedTableConfig>
  ): Promise<boolean> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Saving tables')
        loading.value = true
        error.value = null

        // Get current tables and merge with new ones
        const currentTables = tables.value || {}
        const mergedTables = {
          ...currentTables,
          ...newTables
        }

        // Save tables
        await updateTablesGQL(mergedTables)
        tables.value = mergedTables

        debug.completeState(DebugCategories.STATE, 'Tables saved successfully')
        return true
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save tables', err)
        error.value = err instanceof Error ? err : new Error('Failed to save tables')
        throw error.value
      } finally {
        loading.value = false
      }
    })
  }

  // Helper function to add a single table
  async function addTable(
    tableId: string,
    tableConfig: NamedTableConfig
  ): Promise<boolean> {
    try {
      debug.startState(DebugCategories.STATE, 'Adding single table')

      // Get current tables
      const currentTables = tables.value || {}

      // Add new table with name_id key
      const updatedTables = {
        ...currentTables,
        [`${tableConfig.name}_${tableId}`]: tableConfig
      }

      // Save the updated tables
      const result = await saveTables(updatedTables)

      debug.completeState(DebugCategories.STATE, 'Single table added successfully')
      return result
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to add table', err)
      throw err
    }
  }

  return {
    tables,
    loading,
    error,
    loadTables,
    saveTables,
    addTable
  }
}
