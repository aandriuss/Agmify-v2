import { ref, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useTablesGraphQL } from './useTablesGraphQL'
import { useUpdateQueue } from '../useUpdateQueue'
import type { NamedTableConfig, ColumnDef, TableConfig } from '~/composables/core/types'
import { defaultTable } from '~/components/viewer/schedules/config/defaultColumns'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  isBimColumnDef,
  isUserColumnDef
} from '~/composables/core/types'
import { useStore } from '~/composables/core/store'

const LAST_SELECTED_TABLE_KEY = 'speckle:lastSelectedTableId'

// Default categories
const DEFAULT_PARENT_CATEGORIES = ['Walls', 'Floors', 'Roofs']
const DEFAULT_CHILD_CATEGORIES = [
  'Structural Framing',
  'Structural Connections',
  'Windows',
  'Doors',
  'Ducts',
  'Pipes',
  'Cable Trays',
  'Conduits',
  'Lighting Fixtures'
]

interface TablesState {
  tables: Record<string, NamedTableConfig>
  loading: boolean
  error: Error | null
}

type RawTable = Omit<TableConfig, 'lastUpdateTimestamp'> & {
  displayName?: string
  description?: string
}

function deepClone<T extends Record<string, unknown>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T
}

export function useTablesState() {
  const store = useStore()

  // Initialize with empty state
  const state = ref<TablesState>({
    tables: {},
    loading: false,
    error: null
  })

  const isUpdating = ref(false)
  const lastUpdateTime = ref(0)
  const selectedTableId = ref<string | null>(
    localStorage.getItem(LAST_SELECTED_TABLE_KEY) || null
  )
  const originalTables = ref<Record<string, NamedTableConfig>>({})

  // Initialize GraphQL operations
  const { result, queryLoading, fetchTables, updateTables } = useTablesGraphQL()
  const { queueUpdate } = useUpdateQueue()

  function formatTableKey(table: NamedTableConfig): string {
    const sanitizedName = table.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    return `${sanitizedName}_${table.id}`
  }

  function validateColumnDefs(arr: unknown[]): ColumnDef[] {
    return arr.filter((col): col is ColumnDef => {
      if (!col || typeof col !== 'object') return false

      // Check if it's already a valid ColumnDef
      if (isBimColumnDef(col) || isUserColumnDef(col)) return true

      // Try to convert to appropriate type
      const candidate = col as Record<string, unknown>
      if ('sourceValue' in candidate && 'fetchedGroup' in candidate) {
        return isBimColumnDef(
          createBimColumnDefWithDefaults({
            ...candidate,
            field: String(candidate.field || '')
          })
        )
      }

      if ('group' in candidate) {
        return isUserColumnDef(
          createUserColumnDefWithDefaults({
            ...candidate,
            field: String(candidate.field || '')
          })
        )
      }

      return false
    })
  }

  function validateAndTransformTable(rawTable: RawTable): NamedTableConfig {
    // Get existing categories or use defaults
    const existingFilters = rawTable.categoryFilters || {}
    const categoryFilters = {
      selectedParentCategories:
        existingFilters.selectedParentCategories?.length > 0
          ? existingFilters.selectedParentCategories
          : DEFAULT_PARENT_CATEGORIES,
      selectedChildCategories:
        existingFilters.selectedChildCategories?.length > 0
          ? existingFilters.selectedChildCategories
          : DEFAULT_CHILD_CATEGORIES
    }

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
      categoryFilters,
      selectedParameterIds: Array.isArray(rawTable.selectedParameterIds)
        ? rawTable.selectedParameterIds.filter(
            (id): id is string => typeof id === 'string'
          )
        : [],
      description: rawTable.description,
      lastUpdateTimestamp: Date.now()
    }
  }

  // Watch for tables changes
  watch(
    () => result.value?.activeUser?.tables,
    (newTables) => {
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
        // Process tables from the response
        if (newTables && Object.keys(newTables).length > 0) {
          const processedTables: Record<string, NamedTableConfig> = {}

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
        } else {
          // Only use default table if no tables exist
          state.value = {
            ...state.value,
            tables: { defaultTable },
            error: null
          }
        }

        // Store original state for change detection
        originalTables.value = deepClone(state.value.tables)

        // Handle table selection
        if (!selectedTableId.value) {
          const storedId = localStorage.getItem(LAST_SELECTED_TABLE_KEY)
          if (storedId) {
            const tableExists = Object.values(state.value.tables).some(
              (table) => table.id === storedId
            )
            if (tableExists) {
              selectTable(storedId)
            }
          }
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to process tables')
        debug.error(DebugCategories.ERROR, 'Failed to process tables', error)
        state.value.error = error
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
      const currentSelectedId = selectedTableId.value

      // Only use default table if no tables exist
      if (Object.keys(tables).length > 0) {
        state.value.tables = tables
      } else {
        state.value.tables = { defaultTable }
        debug.log(DebugCategories.INITIALIZATION, 'No tables found, using default')
      }

      // Store original state for change detection
      originalTables.value = deepClone(state.value.tables)

      // Restore selected table if it exists
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
        selectedTableId: selectedTableId.value,
        usingDefault: Object.keys(tables).length === 0
      })

      debug.completeState(DebugCategories.INITIALIZATION, 'Tables loaded successfully')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load tables')
      debug.error(DebugCategories.ERROR, 'Failed to load tables', error)
      state.value.error = error
      // Use default table on error
      state.value.tables = { defaultTable }
      originalTables.value = { defaultTable }
      throw error
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
          state.value.tables = mergedTables

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
        const error = err instanceof Error ? err : new Error('Failed to save tables')
        debug.error(DebugCategories.ERROR, 'Failed to save tables', error)
        state.value.error = error
        throw error
      } finally {
        state.value.loading = false
        isUpdating.value = false
      }
    })
  }

  async function selectTable(tableId: string) {
    debug.log(DebugCategories.STATE, 'Selecting table', { tableId })
    selectedTableId.value = tableId
    localStorage.setItem(LAST_SELECTED_TABLE_KEY, tableId)

    // Find selected table
    const selectedTable = Object.values(state.value.tables).find(
      (table) => table.id === tableId
    )

    if (selectedTable) {
      // Update store with selected table's data
      await store.lifecycle.update({
        selectedTableId: selectedTable.id,
        currentTableId: selectedTable.id,
        tableName: selectedTable.name,
        parentBaseColumns: selectedTable.parentColumns,
        childBaseColumns: selectedTable.childColumns,
        parentVisibleColumns: selectedTable.parentColumns,
        childVisibleColumns: selectedTable.childColumns,
        selectedParentCategories:
          selectedTable.categoryFilters.selectedParentCategories,
        selectedChildCategories: selectedTable.categoryFilters.selectedChildCategories
      })
    }
  }

  function deselectTable() {
    debug.log(DebugCategories.STATE, 'Deselecting table')
    selectedTableId.value = null
    localStorage.removeItem(LAST_SELECTED_TABLE_KEY)
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
    originalTables,
    loadTables,
    saveTables,
    selectTable,
    deselectTable,
    getSelectedTable
  }
}
