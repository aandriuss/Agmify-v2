<template>
  <ViewerLayoutPanel @close="$emit('close')">
    <template #title>Datasets</template>
    <LoadingState
      :is-loading="!isInitialized"
      :error="error"
      :loading-message="currentPhase === 'complete' ? '' : 'Loading data...'"
    >
      <TableLayout class="viewer-container">
        <template #header>
          <ScheduleTableHeader
            @manage-parameters="showParameterManager = !showParameterManager"
          />
        </template>
        <template #menu>
          <div class="menu-container">
            <CategoryMenu v-show="tableStore.state.value.ui.showCategoryOptions" />
          </div>
        </template>

        <template #default>
          <div class="schedule-container">
            <ScheduleMainView
              @error="handleError"
              @table-updated="handleTableDataUpdate"
              @column-visibility-change="handleColumnVisibilityChange"
            />
          </div>
        </template>
      </TableLayout>
    </LoadingState>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { gql } from '@apollo/client/core'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useScheduleInitialization } from './composables/useScheduleInitialization'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import type { TableColumn } from '~/composables/core/types'
import type { ColumnVisibilityPayload } from '~/composables/core/types/tables/table-events'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import ScheduleMainView from './components/ScheduleMainView.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import CategoryMenu from '~/components/core/tables/menu/CategoryMenu.vue'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useTablesGraphQL } from '~/composables/settings/tables/useTablesGraphQL'
import type {
  ViewerNode,
  WorldTreeRoot
} from '~/composables/core/types/viewer/viewer-types'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'
import { useApolloClient, provideApolloClient } from '@vue/apollo-composable'
import { childCategories } from '~/composables/core/config/categories'
import ScheduleTableHeader from './components/ScheduleTableHeader.vue'
import { isTableColumn } from '~/composables/core/tables/store/types'

// Type-safe error handling utility
function createSafeError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error('An unknown error occurred')
}

// Initialize systems
const debug = useDebug()
const store = useStore()
const parameterStore = useParameterStore()
const tableStore = useTableStore()
const bimElements = useBIMElements({
  childCategories
})

// Get viewer state
const {
  viewer: {
    metadata: { worldTree },
    init
  }
} = useInjectedViewerState()

// Type guard to check if children array exists and is non-empty
function hasValidChildren(
  node: unknown
): node is { _root: { children: ViewerNode[] } } {
  if (!node || typeof node !== 'object') return false
  const candidate = node as { _root?: { children?: ViewerNode[] } }
  return !!(
    candidate._root?.children &&
    Array.isArray(candidate._root.children) &&
    candidate._root.children.length > 0
  )
}

// Watch world tree changes for debugging only
watch(worldTree, (newTree) => {
  debug.log(DebugCategories.DATA, 'World tree updated', {
    exists: !!newTree,
    hasRoot: !!(newTree && '_root' in newTree),
    childrenCount: hasValidChildren(newTree) ? newTree._root.children.length : 0
  })
})

// Initialize refs with proper types
const error = ref<Error | null>(null)
const showParameterManager = ref(false)
const initializationAttempted = ref(false)

// Initialize data composables with store categories
const elementsData = useElementsData({
  selectedParentCategories: computed(
    () =>
      tableStore.computed.currentTable.value?.categoryFilters
        .selectedParentCategories || []
  ),
  selectedChildCategories: computed(
    () =>
      tableStore.computed.currentTable.value?.categoryFilters.selectedChildCategories ||
      []
  )
})

// Initialize core composables
// Create a store adapter that matches the Store interface
const storeAdapter = {
  ...store,
  lifecycle: {
    init: async () => {
      if (tableStore.initialize) {
        await tableStore.initialize()
      } else {
        await store.lifecycle.init()
      }
    },
    update: async (updates: Record<string, unknown>) => {
      // Handle column updates through table store
      if ('currentTableColumns' in updates || 'currentDetailColumns' in updates) {
        const parentColumns = Array.isArray(updates.currentTableColumns)
          ? (updates.currentTableColumns as TableColumn[])
          : []
        const childColumns = Array.isArray(updates.currentDetailColumns)
          ? (updates.currentDetailColumns as TableColumn[])
          : []
        await tableStore.updateColumns(parentColumns, childColumns)
      }
      // Pass other updates to core store
      else {
        await store.lifecycle.update(updates)
      }
    },
    cleanup: async () => {
      if (tableStore.reset) {
        await tableStore.reset()
      } else {
        await store.lifecycle.cleanup()
      }
    }
  }
}

const { initComponent } = useScheduleInitialization({
  store: storeAdapter
})

// Loading state management
const { isLoading, currentPhase, transitionPhase, validateData } = useLoadingState()

// Computed properties for component state
const isInitialized = computed(() => currentPhase.value === 'complete')

// Handler functions with type safety
function handleTableDataUpdate(): void {
  updateErrorState(null)
}

async function handleColumnVisibilityChange(
  payload: ColumnVisibilityPayload
): Promise<void> {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
      field: payload.column.id,
      visible: payload.visible
    })

    // Map and validate columns
    const currentParentColumns =
      tableStore.computed.currentTable.value?.parentColumns || []
    const updatedParentColumns = currentParentColumns.map((col): TableColumn => {
      if (!isTableColumn(col)) {
        throw new Error('Invalid parent column structure')
      }
      return {
        ...col,
        visible: col.id === payload.column.id ? payload.visible : col.visible,
        parameter: {
          ...col.parameter,
          visible:
            col.id === payload.column.id ? payload.visible : col.parameter.visible
        }
      }
    })

    const currentChildColumns =
      tableStore.computed.currentTable.value?.childColumns || []
    const updatedChildColumns = currentChildColumns.map((col): TableColumn => {
      if (!isTableColumn(col)) {
        throw new Error('Invalid child column structure')
      }
      return {
        ...col,
        visible: col.id === payload.column.id ? payload.visible : col.visible,
        parameter: {
          ...col.parameter,
          visible:
            col.id === payload.column.id ? payload.visible : col.parameter.visible
        }
      }
    })

    // Update column visibility in table store
    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated', {
      columnId: payload.column.id,
      visible: payload.visible,
      type: payload.column.parameter.kind
    })

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated in stores')
  } catch (err) {
    updateErrorState(createSafeError(err))
  }
}

// Type-safe error handling with proper type guards
function updateErrorState(newError: Error | null): void {
  const currentError = error.value
  const shouldUpdate = currentError?.message !== newError?.message

  if (shouldUpdate) {
    error.value = newError
  }

  if (newError instanceof Error) {
    const errorDetails: {
      name: string
      message: string
      stack?: string
      cause?: unknown
    } = {
      name: newError.name,
      message: newError.message,
      stack: newError.stack,
      cause: newError.cause
    }
    debug.error(DebugCategories.ERROR, 'Schedule error:', errorDetails)
    debug.error(DebugCategories.ERROR, 'Error in schedule view:', {
      error: errorDetails,
      state: {
        phase: currentPhase.value,
        isLoading: isLoading.value,
        hasElements: bimElements.allElements.value?.length || 0,
        hasParameters: parameterStore.parentRawParameters.value?.length || 0,
        hasTable: !!tableStore.computed.currentTable.value
      }
    })
  }
}

function handleError(err: unknown): void {
  const error = createSafeError(err)
  debug.error(DebugCategories.ERROR, 'Failed to load initial data:', {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause as unknown
    },
    state: {
      phase: currentPhase.value,
      isLoading: isLoading.value,
      hasElements: bimElements.allElements.value?.length || 0,
      hasParameters: parameterStore.parentRawParameters.value?.length || 0,
      hasTable: !!tableStore.computed.currentTable.value
    }
  })
  updateErrorState(error)
}

// Helper to wait for world tree with timeout
const waitForWorldTree = async (timeoutMs = 5000): Promise<void> => {
  if (init.ref.value && worldTree.value) return

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('World tree initialization timed out'))
    }, timeoutMs)

    const unwatch = watch(
      () => ({ init: init.ref.value, tree: worldTree.value }),
      ({ init, tree }) => {
        if (init && tree) {
          clearTimeout(timeout)
          unwatch()
          resolve()
        }
      },
      { immediate: true }
    )
  })
}

// Initialize with phase-based loading
onMounted(async () => {
  if (initializationAttempted.value) {
    debug.warn(DebugCategories.INITIALIZATION, 'Initialization already attempted')
    return
  }

  try {
    // Start initialization sequence
    transitionPhase('initial')
    debug.startState(DebugCategories.INITIALIZATION, 'Starting initialization sequence')

    // 1. Initialize Apollo client
    const { client: apolloClient } = useApolloClient()
    if (!apolloClient) throw new Error('Apollo client not initialized')
    provideApolloClient(apolloClient)

    // Wait for Apollo client to be ready
    await new Promise<void>((resolve, reject) => {
      let attempts = 0
      const maxAttempts = 50 // 5 seconds total

      const checkClient = async () => {
        attempts++
        debug.log(DebugCategories.INITIALIZATION, 'Checking Apollo client', {
          attempt: attempts,
          hasClient: !!apolloClient,
          hasCache: !!apolloClient.cache
        })

        // Try to execute a simple query to verify client is ready
        try {
          await apolloClient.query({
            query: gql`
              query TestQuery {
                __typename
              }
            `
          })
          debug.log(DebugCategories.INITIALIZATION, 'Apollo client ready')
          resolve()
        } catch (err) {
          debug.log(DebugCategories.INITIALIZATION, 'Apollo client not ready yet', {
            attempt: attempts,
            error: err
          })
          if (attempts >= maxAttempts) {
            reject(new Error('Apollo client initialization timed out'))
          } else {
            setTimeout(checkClient, 100)
          }
        }
      }
      void checkClient()
    })

    debug.log(DebugCategories.INITIALIZATION, 'Apollo client ready')

    // 2. Initialize core store
    transitionPhase('core_store')
    debug.log(DebugCategories.INITIALIZATION, 'Initializing core store')
    await store.lifecycle.init()
    if (!store.initialized.value) {
      debug.error(DebugCategories.ERROR, 'Core store failed to initialize', {
        storeState: store.state.value
      })
      throw new Error('Core store failed to initialize')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Core store initialized')

    // 3. Initialize parameter store
    transitionPhase('parameter_store')
    debug.log(DebugCategories.INITIALIZATION, 'Initializing parameter store')
    await parameterStore.init()
    if (!parameterStore.state.value.initialized) {
      debug.error(DebugCategories.ERROR, 'Parameter store failed to initialize', {
        parameterState: parameterStore.state.value
      })
      throw new Error('Parameter store failed to initialize')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Parameter store initialized')

    // 4. Initialize table store
    transitionPhase('table_store')
    debug.log(DebugCategories.INITIALIZATION, 'Initializing table store')
    await initComponent.initialize()
    if (!tableStore.computed.currentTable.value) {
      debug.error(DebugCategories.ERROR, 'Table store failed to initialize', {
        tableState: tableStore.state.value,
        currentTable: tableStore.computed.currentTable.value
      })
      throw new Error('Table store failed to initialize')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Table store initialized')

    // 5. Wait for auth
    const waitForUser = useWaitForActiveUser()
    const userResult = await waitForUser()
    if (!userResult?.data?.activeUser) {
      throw new Error('Authentication required')
    }

    // 6. Initialize world tree
    transitionPhase('world_tree')
    await waitForWorldTree()
    if (!worldTree.value) {
      throw new Error('World tree not available')
    }

    // 7. Initialize BIM elements
    transitionPhase('bim_elements')
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: hasValidChildren(worldTree.value)
          ? worldTree.value._root.children
          : []
      }
    }

    await bimElements.initializeElements(treeRoot)
    const elementsWithParams =
      bimElements.allElements.value?.filter(
        (el) => el.parameters && Object.keys(el.parameters).length > 0
      ) || []

    if (elementsWithParams.length === 0) {
      throw new Error('No parameters found in BIM elements')
    }

    // Process parameters
    await parameterStore.processParameters(elementsWithParams)
    const validation = validateData()
    if (!validation.hasParameters) {
      throw new Error('Parameter processing failed')
    }

    // 8. Load tables and initialize data
    transitionPhase('data_sync')

    try {
      // First initialize table store
      await tableStore.initialize()
      debug.log(DebugCategories.INITIALIZATION, 'Table store initialized')

      // Then fetch tables from GraphQL
      const graphqlOps = await useTablesGraphQL()
      const tables = await graphqlOps.fetchTables()
      debug.log(DebugCategories.INITIALIZATION, 'Tables fetched from GraphQL', {
        tableCount: Object.keys(tables).length
      })

      // Initialize element data
      await elementsData.initializeData()
      if (elementsData.hasError.value) {
        throw new Error('Failed to initialize element data')
      }
      debug.log(DebugCategories.INITIALIZATION, 'Element data initialized')

      // Process and update tables in store
      const existingTables = Object.entries(tables)
        .map(([id, table]) => ({
          id,
          name: table.name || 'Unnamed Table'
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      // Get current table or first available
      const currentId = store.state.value.currentTableId
      const currentTable = currentId ? tables[currentId] : existingTables[0]
      const selectedId = currentId || currentTable?.id

      if (selectedId) {
        await tableStore.loadTable(selectedId)
        const loadedTable = tableStore.computed.currentTable.value
        if (loadedTable) {
          // Update store state with all tables
          await store.lifecycle.update({
            tablesArray: existingTables,
            selectedTableId: selectedId,
            tableName: loadedTable.name
          })
        }
      }

      debug.log(DebugCategories.INITIALIZATION, 'Store updated with tables', {
        tableCount: existingTables.length,
        tableIds: existingTables.map((t) => t.id),
        selectedId: store.state.value.currentTableId
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize tables:', err)
      throw new Error('Failed to initialize tables')
    }

    // Final validation
    const finalValidation = validateData()
    if (!finalValidation.dataConsistent) {
      throw new Error('Data inconsistency detected after initialization')
    }

    // Check if we're already initialized
    if (currentPhase.value === 'complete') {
      debug.log(
        DebugCategories.INITIALIZATION,
        'Already initialized, skipping completion'
      )
      return
    }

    // Check if we have everything we need
    const hasData = (store.scheduleData.value?.length ?? 0) > 0
    const hasTable = !!tableStore.computed.currentTable.value
    const hasParams = parameterStore.state.value.initialized

    debug.log(DebugCategories.INITIALIZATION, 'Checking initialization state:', {
      hasData,
      hasTable,
      hasParams,
      dataLength: store.scheduleData.value?.length ?? 0
    })

    // Complete initialization if we have everything
    if (hasData && hasTable && hasParams) {
      transitionPhase('complete')
      debug.completeState(DebugCategories.INITIALIZATION, 'Initialization complete')
      return
    }

    // Otherwise, throw an error
    throw new Error('Missing required data')
  } catch (err) {
    handleError(err)
  }
})
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}
</style>
