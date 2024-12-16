import { ref, computed, type ComputedRef } from 'vue'
import type {
  NamedTableConfig,
  Parameter,
  UserParameter,
  ColumnDef
} from '~/composables/core/types'
import {
  createUserParameterWithDefaults,
  isUserParameter,
  isBimColumnDef,
  isUserColumnDef,
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults
} from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useBIMElements } from './useBIMElements'

export interface UseTableFlowOptions {
  currentTable: ComputedRef<NamedTableConfig | null>
  defaultConfig: {
    id: string
    name: string
    displayName: string
    parentColumns: NamedTableConfig['parentColumns']
    childColumns: NamedTableConfig['childColumns']
    categoryFilters: NamedTableConfig['categoryFilters']
    selectedParameterIds: string[]
    userParameters?: Parameter[]
    lastUpdateTimestamp: number
  }
}

interface InitializationState {
  initialized: boolean
  loading: boolean
  error: Error | null
}

/**
 * Convert parameters to user parameters
 */
function ensureUserParameters(parameters: Parameter[]): UserParameter[] {
  return parameters
    .filter((param): param is UserParameter => isUserParameter(param))
    .map((param) =>
      createUserParameterWithDefaults({
        ...param,
        group: param.group || 'Custom'
      })
    )
}

/**
 * Merge BIM columns with user columns
 */
function mergeColumns(bimColumns: ColumnDef[], userColumns: ColumnDef[]): ColumnDef[] {
  const columnMap = new Map<string, ColumnDef>()

  // Add BIM columns first
  bimColumns.forEach((col) => {
    if (isBimColumnDef(col)) {
      columnMap.set(
        col.field,
        createBimColumnDefWithDefaults({
          ...col,
          kind: 'bim'
        })
      )
    }
  })

  // Override with user columns
  userColumns.forEach((col) => {
    if (isUserColumnDef(col)) {
      columnMap.set(
        col.field,
        createUserColumnDefWithDefaults({
          ...col,
          kind: 'user'
        })
      )
    } else if (isBimColumnDef(col)) {
      // If it's a BIM column in user columns, preserve user settings
      const existing = columnMap.get(col.field)
      if (existing && isBimColumnDef(existing)) {
        columnMap.set(col.field, {
          ...existing,
          ...col,
          kind: 'bim',
          sourceValue: existing.sourceValue,
          fetchedGroup: existing.fetchedGroup,
          currentGroup: existing.currentGroup
        })
      } else {
        columnMap.set(col.field, col)
      }
    }
  })

  return Array.from(columnMap.values())
}

/**
 * Manages the flow of data and initialization between different parts of the table system,
 * ensuring proper type conversion and state management.
 */
export function useTableFlow({ currentTable, defaultConfig }: UseTableFlowOptions) {
  const store = useStore()
  const { allColumns } = useBIMElements()

  const state = ref<InitializationState>({
    initialized: false,
    loading: false,
    error: null
  })

  // Keep the NamedTableConfig type intact, use defaults if no table
  const tableConfig = computed<NamedTableConfig>(() => {
    const table = currentTable.value
    if (!table) {
      debug.log(DebugCategories.STATE, 'No table available, using defaults', {
        defaultColumns: defaultConfig.parentColumns.length,
        defaultDetailColumns: defaultConfig.childColumns.length
      })
      return {
        ...defaultConfig,
        id: defaultConfig.id,
        name: defaultConfig.name,
        displayName: defaultConfig.displayName,
        lastUpdateTimestamp: Date.now()
      }
    }

    debug.log(DebugCategories.STATE, 'Processing table config', {
      id: table.id,
      name: table.name,
      parentColumnsCount: table.parentColumns.length,
      childColumnsCount: table.childColumns.length
    })

    // Merge BIM columns with user columns
    const parentColumns = mergeColumns(allColumns.value, table.parentColumns)
    const childColumns = mergeColumns(allColumns.value, table.childColumns)

    // Return table with merged columns
    return {
      ...table,
      parentColumns,
      childColumns,
      categoryFilters: table.categoryFilters || defaultConfig.categoryFilters,
      userParameters: ensureUserParameters(
        table.userParameters || defaultConfig.userParameters || []
      ),
      selectedParameterIds:
        table.selectedParameterIds || defaultConfig.selectedParameterIds,
      lastUpdateTimestamp: table.lastUpdateTimestamp || Date.now()
    }
  })

  /**
   * Initialize store with base configuration
   */
  async function initializeStore() {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing store')

    // Initialize store if needed
    if (!store.initialized.value) {
      await store.lifecycle.init()
    }

    // Update store with table configuration
    await store.lifecycle.update({
      selectedTableId: tableConfig.value.id,
      currentTableId: tableConfig.value.id,
      tableName: tableConfig.value.name,
      parentBaseColumns: tableConfig.value.parentColumns,
      childBaseColumns: tableConfig.value.childColumns,
      parentVisibleColumns: tableConfig.value.parentColumns,
      childVisibleColumns: tableConfig.value.childColumns,
      selectedParentCategories:
        tableConfig.value.categoryFilters.selectedParentCategories,
      selectedChildCategories:
        tableConfig.value.categoryFilters.selectedChildCategories,
      userParameters: ensureUserParameters(tableConfig.value.userParameters || [])
    })

    debug.completeState(DebugCategories.INITIALIZATION, 'Store initialized')
  }

  /**
   * Initializes the table system
   */
  async function initialize() {
    debug.startState(DebugCategories.INITIALIZATION, 'Table initialization')
    state.value.loading = true
    state.value.error = null

    try {
      // First initialize store with base configuration
      await initializeStore()

      // Mark as initialized so data loading can proceed
      state.value.initialized = true

      debug.log(DebugCategories.INITIALIZATION, 'Table initialization complete', {
        storeInitialized: store.initialized.value,
        tableInitialized: state.value.initialized,
        tableId: tableConfig.value.id,
        columnsCount: {
          parent: tableConfig.value.parentColumns.length,
          child: tableConfig.value.childColumns.length
        }
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      state.value.error = new Error(`Initialization failed: ${errorMessage}`)

      debug.error(DebugCategories.ERROR, 'Initialization failed:', {
        error: err,
        storeState: {
          initialized: store.initialized.value,
          tableInitialized: state.value.initialized,
          tableId: tableConfig.value.id
        }
      })
      throw state.value.error
    } finally {
      state.value.loading = false
      debug.completeState(DebugCategories.INITIALIZATION, 'Table initialization')
    }
  }

  // Computed properties for state
  const isInitialized = computed(
    () => state.value.initialized && store.initialized.value
  )
  const isLoading = computed(() => state.value.loading)
  const error = computed(() => state.value.error)

  return {
    // Table configuration
    tableConfig,

    // Initialization
    initialize,
    isInitialized,
    isLoading,
    error,

    // State management
    state: computed(() => state.value)
  }
}
