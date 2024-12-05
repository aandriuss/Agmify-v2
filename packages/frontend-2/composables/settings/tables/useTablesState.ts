import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'
import { useTablesGraphQL } from './useTablesGraphQL'
import { useUpdateQueue } from '../useUpdateQueue'
import type { NamedTableConfig, TablesState, ColumnDef } from '~/composables/core/types'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'

type RawTable = {
  id: string
  name: string
  displayName?: string
  parentColumns?: ColumnDef[]
  childColumns?: ColumnDef[]
  categoryFilters?: {
    selectedParentCategories: string[]
    selectedChildCategories: string[]
  }
  selectedParameterIds?: string[]
  description?: string
}

function deepClone<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

export function useTablesState() {
  // Initialize with default table
  const state = ref<TablesState>({
    tables: {
      defaultTable
    },
    loading: false,
    error: null
  })

  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)
  const selectedTableId = ref<string | null>(null)
  const originalTables = ref<Record<string, NamedTableConfig>>({})

  // Initialize GraphQL operations
  const { result, queryLoading, fetchTables, updateTables } = useTablesGraphQL()
  const { queueUpdate } = useUpdateQueue()

  function formatTableKey(table: NamedTableConfig): string {
    // Create a key in format name_id
    const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `${sanitizedName}_${table.id}`
  }

  function isColumnDef(value: unknown): value is ColumnDef {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'name' in value &&
      'field' in value
    )
  }

  function validateColumnDefs(arr: unknown[]): ColumnDef[] {
    const validColumns = arr.filter(isColumnDef)
    return validColumns.map((col) => ({
      ...col,
      type: col.type || 'string',
      source: col.source || 'Parameters',
      category: col.category || 'Uncategorized',
      description: col.description || '',
      visible: col.visible ?? true,
      removable: col.removable ?? true,
      order: col.order ?? 0
    }))
  }

  function validateAndTransformTable(rawTable: RawTable): NamedTableConfig {
    return {
      id: rawTable.id,
      name: rawTable.name,
      displayName: rawTable.displayName || rawTable.name,
      parentColumns: Array.isArray(rawTable.parentColumns)
        ? validateColumnDefs(rawTable.parentColumns)
        : [],
      childColumns: Array.isArray(rawTable.childColumns)
        ? validateColumnDefs(rawTable.childColumns)
        : [],
      categoryFilters: rawTable.categoryFilters || {
        selectedParentCategories: [],
        selectedChildCategories: []
      },
      selectedParameterIds: Array.isArray(rawTable.selectedParameterIds)
        ? rawTable.selectedParameterIds.filter(
            (id): id is string => typeof id === 'string'
          )
        : [],
      description: rawTable.description
    }
  }

  // Watch for tables changes
  watch(
    () => result.value?.activeUser?.tables,
    (newTables) => {
      // Skip if we're updating or if this is a response to our own update
      const timeSinceLastUpdate = Date.now() - lastUpdateTime.value
      if (isUpdating.value || timeSinceLastUpdate < 500) {
        debug.log(
          DebugCategories.INITIALIZATION,
          'Skipping tables update during local change',
          { isUpdating: isUpdating.value, timeSinceLastUpdate }
        )
        return
      }

      debug.log(DebugCategories.INITIALIZATION, 'Raw tables received', {
        hasTables: !!newTables,
        tableCount: newTables ? Object.keys(newTables).length : 0
      })

      try {
        // Update tables in state
        if (newTables) {
          const processedTables: Record<string, NamedTableConfig> = {
            defaultTable
          }

          // Process tables from the response
          Object.entries(newTables).forEach(([_, tableData]) => {
            if (
              tableData &&
              typeof tableData === 'object' &&
              'id' in tableData &&
              'name' in tableData
            ) {
              const rawTable = tableData as RawTable
              const validatedTable = validateAndTransformTable(rawTable)
              const key = formatTableKey(validatedTable)
              processedTables[key] = validatedTable

              // Re-select table if it was previously selected
              if (validatedTable.id === selectedTableId.value) {
                selectTable(validatedTable.id)
              }
            }
          })

          state.value = {
            ...state.value,
            tables: processedTables,
            error: null
          }

          // Store original state for change detection
          originalTables.value = deepClone(processedTables)
        } else {
          state.value = {
            ...state.value,
            tables: { defaultTable },
            error: null
          }
          originalTables.value = { defaultTable }
        }
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to process tables', err)
        state.value.error =
          err instanceof Error ? err : new Error('Failed to process tables')
      }
    },
    { deep: true }
  )

  async function loadTables(): Promise<void> {
    try {
      debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
      state.value.loading = true
      state.value.error = null

      const tables = await fetchTables()

      // Remember selected table ID
      const currentSelectedId = selectedTableId.value

      // Merge with default table
      state.value.tables = {
        defaultTable,
        ...tables
      }

      // Store original state for change detection
      originalTables.value = deepClone(state.value.tables)

      // Restore selected table if it still exists
      if (currentSelectedId) {
        const tableExists = Object.values(tables).some(
          (table) => table.id === currentSelectedId
        )
        if (tableExists) {
          selectTable(currentSelectedId)
        }
      }

      debug.log(DebugCategories.INITIALIZATION, 'Tables loaded', {
        tablesCount: Object.keys(state.value.tables).length,
        selectedTableId: selectedTableId.value
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Tables loaded successfully')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to load tables', err)
      state.value.error =
        err instanceof Error ? err : new Error('Failed to load tables')
      // Use default table on error
      state.value.tables = { defaultTable }
      originalTables.value = { defaultTable }
      throw state.value.error
    } finally {
      state.value.loading = false
    }
  }

  async function saveTables(
    newTables: Record<string, NamedTableConfig>
  ): Promise<boolean> {
    return queueUpdate(async () => {
      try {
        debug.startState(DebugCategories.STATE, 'Saving tables')
        state.value.loading = true
        state.value.error = null
        isUpdating.value = true
        lastUpdateTime.value = Date.now()

        debug.log(DebugCategories.STATE, 'Saving tables', {
          currentCount: Object.keys(state.value.tables).length,
          newCount: Object.keys(newTables).length
        })

        // Remember selected table ID
        const currentSelectedId = selectedTableId.value

        // Get existing tables from state, excluding default table
        const existingTables = Object.entries(state.value.tables).reduce<
          Record<string, NamedTableConfig>
        >((acc, [key, table]) => {
          if (table.id === defaultTable.id) return acc
          return { ...acc, [key]: table }
        }, {})

        // Only update tables that have changed
        const mergedTables = {
          ...existingTables,
          ...Object.entries(newTables).reduce<Record<string, NamedTableConfig>>(
            (acc, [_, table]) => {
              if (table.id === defaultTable.id) return acc
              const validatedTable = validateAndTransformTable(table)
              const key = formatTableKey(validatedTable)

              // Only include if table has changed
              const originalTable = originalTables.value[key]
              if (
                !originalTable ||
                JSON.stringify(originalTable) !== JSON.stringify(validatedTable)
              ) {
                return { ...acc, [key]: validatedTable }
              }
              return acc
            },
            {}
          )
        }

        const success = await updateTables(mergedTables)
        if (success) {
          state.value.tables = {
            defaultTable,
            ...mergedTables
          }

          // Update original state after successful save
          originalTables.value = deepClone(state.value.tables)

          // Restore selected table if it still exists
          if (currentSelectedId) {
            const tableExists = Object.values(mergedTables).some(
              (table) => table.id === currentSelectedId
            )
            if (tableExists) {
              selectTable(currentSelectedId)
            }
          }
        }

        debug.completeState(DebugCategories.STATE, 'Tables saved')
        return success
      } catch (err) {
        debug.error(DebugCategories.ERROR, 'Failed to save tables', err)
        state.value.error =
          err instanceof Error ? err : new Error('Failed to save tables')
        throw state.value.error
      } finally {
        state.value.loading = false
        isUpdating.value = false
      }
    })
  }

  function selectTable(tableId: string) {
    debug.log(DebugCategories.STATE, 'Selecting table', { tableId })
    selectedTableId.value = tableId
  }

  function deselectTable() {
    debug.log(DebugCategories.STATE, 'Deselecting table')
    selectedTableId.value = null
  }

  function getSelectedTable(): NamedTableConfig | null {
    if (!selectedTableId.value) return null

    // Find table by ID, not by key
    const selectedTable = Object.values(state.value.tables).find(
      (table) => table.id === selectedTableId.value
    )

    if (!selectedTable) {
      debug.warn(DebugCategories.STATE, 'Selected table not found', {
        selectedId: selectedTableId.value,
        availableIds: Object.values(state.value.tables).map((t) => t.id)
      })
      return null
    }

    return selectedTable
  }

  return {
    state,
    loading: state.value.loading || queryLoading.value,
    error: state.value.error,
    isUpdating,
    lastUpdateTime,
    selectedTableId,
    originalTables, // Expose originalTables
    loadTables,
    saveTables,
    selectTable,
    deselectTable,
    getSelectedTable
  }
}
