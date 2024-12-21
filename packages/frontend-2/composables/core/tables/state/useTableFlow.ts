import { ref, computed, type ComputedRef } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter,
  SelectedParameter
} from '~/composables/core/types/parameters/parameter-states'
import {
  createColumnDefinition,
  createSelectedParameter
} from '~/composables/core/types/parameters/parameter-states'
import {
  createBimColumnDefWithDefaults,
  createUserColumnDefWithDefaults,
  type ColumnDef,
  type BimColumnDef,
  type UserColumnDef,
  type PrimitiveValue,
  type NamedTableConfig
} from '~/composables/core/types'

export interface UseTableFlowOptions {
  currentTable: ComputedRef<NamedTableConfig | null>
  defaultConfig: {
    id: string
    name: string
    displayName: string
    parentColumns: NamedTableConfig['parentColumns']
    childColumns: NamedTableConfig['childColumns']
    categoryFilters: NamedTableConfig['categoryFilters']
    selectedParameters: {
      parent: SelectedParameter[]
      child: SelectedParameter[]
    }
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
  const tableStore = useTableStore()
  const parameterStore = useParameterStore()

  const state = ref<InitializationState>({
    initialized: false,
    loading: false,
    error: null
  })

  // Keep the NamedTableConfig type intact, use defaults if no table
  const tableConfig = computed<NamedTableConfig>(() => {
    const inputTable = currentTable.value
    const storedTable = tableStore.currentTable.value

    // Use defaults if no input table
    if (!inputTable) {
      debug.log(DebugCategories.STATE, 'No table available, using defaults', {
        defaultColumns: defaultConfig.parentColumns.length,
        defaultDetailColumns: defaultConfig.childColumns.length,
        note: 'Using default selected parameters until user customizes through Column Manager'
      })
      return {
        ...defaultConfig,
        id: defaultConfig.id,
        name: defaultConfig.name,
        displayName: defaultConfig.displayName,
        selectedParameters: defaultConfig.selectedParameters, // Explicitly use default selected parameters
        lastUpdateTimestamp: Date.now()
      }
    }

    debug.log(DebugCategories.STATE, 'Processing table config', {
      id: inputTable.id,
      name: inputTable.name,
      parentColumnsCount: inputTable.parentColumns.length,
      childColumnsCount: inputTable.childColumns.length
    })

    // Convert columns using available parameters from parameter store
    // and selected parameters from table store
    const selectedParams = {
      parent: storedTable?.selectedParameters?.parent || [],
      child: storedTable?.selectedParameters?.child || []
    }

    const parentColumns = convertToColumnDefs(
      parameterStore.parentAvailableBimParameters.value,
      parameterStore.parentAvailableUserParameters.value,
      selectedParams.parent
    )

    const childColumns = convertToColumnDefs(
      parameterStore.childAvailableBimParameters.value,
      parameterStore.childAvailableUserParameters.value,
      selectedParams.child
    )

    // Return table with converted columns
    return {
      ...inputTable,
      parentColumns,
      childColumns,
      categoryFilters: inputTable.categoryFilters || defaultConfig.categoryFilters,
      selectedParameters:
        storedTable?.selectedParameters || defaultConfig.selectedParameters,
      lastUpdateTimestamp: Date.now()
    }
  })

  /**
   * Initialize store with base configuration
   */
  async function initializeStore() {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing store')

    try {
      // Initialize stores if needed
      if (!store.initialized.value) {
        await store.lifecycle.init()
      }

      // Initialize parameter store for raw/available parameters
      debug.log(DebugCategories.PARAMETERS, 'Initializing parameter store')
      await parameterStore.init()

      const config = tableConfig.value

      // Update stores
      debug.log(DebugCategories.PARAMETERS, 'Updating stores with table configuration')

      // Create table with initial config
      debug.log(DebugCategories.PARAMETERS, 'Creating table with initial config')
      const selectedParams =
        config.selectedParameters.parent.length ||
        config.selectedParameters.child.length
          ? config.selectedParameters // Use provided parameters if they exist
          : defaultConfig.selectedParameters // Otherwise use defaults

      debug.log(DebugCategories.PARAMETERS, 'Using parameters', {
        source: selectedParams === config.selectedParameters ? 'provided' : 'defaults',
        parent: selectedParams.parent.length,
        child: selectedParams.child.length
      })

      // Update table with full config
      debug.log(DebugCategories.PARAMETERS, 'Updating table with full config')
      await tableStore.updateTable({
        ...config,
        id: config.id,
        parentColumns: config.parentColumns,
        childColumns: config.childColumns,
        selectedParameters: selectedParams
      })

      // Update core store with UI state
      await store.lifecycle.update({
        selectedTableId: config.id,
        currentTableId: config.id,
        tableName: config.name,
        selectedParentCategories: config.categoryFilters.selectedParentCategories,
        selectedChildCategories: config.categoryFilters.selectedChildCategories
      })

      // Update current view columns in core store
      await store.setCurrentColumns(config.parentColumns, config.childColumns)

      // Wait for table store to be ready
      await new Promise((resolve) => setTimeout(resolve, 0))

      debug.completeState(DebugCategories.INITIALIZATION, 'Store initialized', {
        defaultConfig: {
          parent: defaultConfig.selectedParameters.parent.length,
          child: defaultConfig.selectedParameters.child.length
        },
        tableStore: {
          selectedParameters: {
            parent:
              tableStore.currentTable.value?.selectedParameters?.parent?.length || 0,
            child: tableStore.currentTable.value?.selectedParameters?.child?.length || 0
          }
        },
        parameterStore: {
          selected: {
            parent: parameterStore.parentSelectedParameters.value?.length || 0,
            child: parameterStore.childSelectedParameters.value?.length || 0
          }
        }
      })

      // Log final state after everything is ready
      debug.log(DebugCategories.PARAMETERS, 'Final parameter state', {
        defaultParameters: defaultConfig.selectedParameters,
        tableStoreParameters: tableStore.currentTable.value?.selectedParameters,
        parameterStoreParameters: {
          parent: parameterStore.parentSelectedParameters.value,
          child: parameterStore.childSelectedParameters.value
        }
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize store:', err)
      throw err
    }
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
