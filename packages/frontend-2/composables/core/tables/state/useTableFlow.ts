import { ref, computed, type ComputedRef } from 'vue'
import type { NamedTableConfig } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '@/composables/core/parameters/store/types'
import {
  createColumnDefinition,
  createSelectedParameter
} from '@/composables/core/parameters/store/types'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  type ColumnDef,
  type BimColumnDef,
  type UserColumnDef,
  type PrimitiveValue
} from '~/composables/core/types/'

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
    lastUpdateTimestamp: number
  }
}

interface InitializationState {
  initialized: boolean
  loading: boolean
  error: Error | null
}

/**
 * Convert parameter value to primitive value
 */
function toPrimitiveValue(value: unknown): PrimitiveValue | null {
  if (value === null || value === undefined) return null
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }
  return String(value)
}

/**
 * Convert available parameters to column definitions
 */
function convertToColumnDefs(
  bimParameters: AvailableBimParameter[],
  userParameters: AvailableUserParameter[],
  selectedParameters: SelectedParameter[]
): ColumnDef[] {
  // Create a map of selected parameters for quick lookup
  const selectedMap = new Map(selectedParameters.map((p) => [p.id, p]))

  // Convert BIM parameters
  const bimColumns: BimColumnDef[] = bimParameters.map((param) => {
    const selected = selectedMap.get(param.id)
    const column = createColumnDefinition(selected || createSelectedParameter(param, 0))
    return createBimColumnDefWithDefaults({
      id: column.id,
      name: column.name,
      field: column.field,
      header: column.header,
      visible: column.visible,
      removable: false,
      order: column.order,
      description: column.description,
      category: column.category,
      type: param.type,
      sourceValue: toPrimitiveValue(param.value),
      fetchedGroup: param.sourceGroup,
      currentGroup: param.currentGroup
    })
  })

  // Convert user parameters
  const userColumns: UserColumnDef[] = userParameters.map((param) => {
    const selected = selectedMap.get(param.id)
    const column = createColumnDefinition(selected || createSelectedParameter(param, 0))
    return createUserColumnDefWithDefaults({
      id: column.id,
      name: column.name,
      field: column.field,
      header: column.header,
      visible: column.visible,
      removable: true,
      order: column.order,
      description: column.description,
      category: column.category,
      type: param.type,
      group: param.group
    })
  })

  // Track parameter stats for debugging
  const stats = {
    bim: bimColumns.length,
    user: userColumns.length,
    groups: new Map<string, number>()
  }

  // Track groups for all parameters
  const allColumns = [...bimColumns, ...userColumns]
  allColumns.forEach((col) => {
    const group = col.kind === 'bim' ? col.currentGroup : col.group
    stats.groups.set(group, (stats.groups.get(group) || 0) + 1)
  })

  debug.log(DebugCategories.DATA_TRANSFORM, 'Column conversion stats', {
    bim: stats.bim,
    user: stats.user,
    groups: Object.fromEntries(stats.groups)
  })

  return allColumns
}

/**
 * Manages the flow of data and initialization between different parts of the table system,
 * ensuring proper type conversion and state management.
 */
export function useTableFlow({ currentTable, defaultConfig }: UseTableFlowOptions) {
  const store = useStore()
  const parameterStore = useParameterStore()

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

    // Convert columns using parameter store
    const parentColumns = convertToColumnDefs(
      parameterStore.parentAvailableBimParameters.value,
      parameterStore.parentAvailableUserParameters.value,
      parameterStore.parentSelectedParameters.value
    )

    const childColumns = convertToColumnDefs(
      parameterStore.childAvailableBimParameters.value,
      parameterStore.childAvailableUserParameters.value,
      parameterStore.childSelectedParameters.value
    )

    // Return table with converted columns
    return {
      ...table,
      parentColumns,
      childColumns,
      categoryFilters: table.categoryFilters || defaultConfig.categoryFilters,
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
      selectedChildCategories: tableConfig.value.categoryFilters.selectedChildCategories
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
