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
            :selected-table-id="_interactions.state.value.selectedTableId"
            :table-name="_interactions.state.value.tableName"
            :tables="store.tablesArray.value || []"
            :show-category-options="showCategoryOptions"
            :has-changes="hasChanges"
            @update:selected-table-id="handleSelectedTableIdUpdate"
            @update:table-name="handleTableNameUpdate"
            @table-change="handleTableChange"
            @save="handleSaveTable"
            @toggle-category-options="showCategoryOptions = !showCategoryOptions"
            @manage-parameters="
              _interactions.showParameterManager.value =
                !_interactions.showParameterManager.value
            "
          />
        </template>
        <template #menu>
          <div class="menu-container">
            <CategoryMenu
              v-show="showCategoryOptions"
              :is-updating="!isInitialized || tablesState.loading.value"
              :error="error"
              :initial-parent-categories="categories.selectedParentCategories.value"
              :initial-child-categories="categories.selectedChildCategories.value"
              @update="handleCategoryUpdate"
            />
            <ParameterManager
              v-show="_interactions.showParameterManager.value"
              :selected-parent-categories="categories.selectedParentCategories.value"
              :selected-child-categories="categories.selectedChildCategories.value"
              :available-parent-parameters="parameterStore.parentAvailableBimParameters"
              :available-child-parameters="parameterStore.childAvailableBimParameters"
              :selected-parent-parameters="
                tableStore.currentTable?.value?.parentColumns || []
              "
              :selected-child-parameters="
                tableStore.currentTable?.value?.childColumns || []
              "
              :can-create-parameters="false"
              @parameter-visibility-change="handleParameterVisibilityChange"
              @error="handleError"
            />
          </div>
        </template>

        <template #default>
          <div class="schedule-container">
            <ScheduleMainView
              :selected-table-id="tableStore.currentTable?.value?.id || ''"
              :current-table="_currentTable"
              :is-initialized="isInitialized"
              :table-name="tableStore.currentTable?.value?.name || ''"
              :current-table-id="tableStore.currentTable?.value?.id || ''"
              :table-key="tableStore.lastUpdated?.toString() || ''"
              :error="error"
              :parent-base-columns="tableStore.currentTable.value?.parentColumns || []"
              :parent-available-columns="parameterStore.parentAvailableBimParameters"
              :parent-visible-columns="
                tableStore.currentTable?.value?.parentColumns || []
              "
              :child-base-columns="tableStore.currentTable?.value?.childColumns || []"
              :child-available-columns="parameterStore.childAvailableBimParameters"
              :child-visible-columns="
                tableStore.currentTable?.value?.childColumns || []
              "
              :schedule-data="unref(store.scheduleData) || []"
              :evaluated-data="unref(store.evaluatedData) || []"
              :table-data="unref(store.tableData) || []"
              :is-loading="false"
              :is-loading-additional-data="false"
              :has-selected-categories="categories.hasSelectedCategories"
              :selected-parent-categories="unref(categories.selectedParentCategories)"
              :selected-child-categories="unref(categories.selectedChildCategories)"
              :show-parameter-manager="_interactions.showParameterManager.value"
              :show-category-options="showCategoryOptions"
              :has-changes="hasChanges"
              :parent-elements="unref(parentElements)"
              :child-elements="unref(childElements)"
              :is-test-mode="false"
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
import { ref, computed, onMounted, watch, unref } from 'vue'
import { isEqual } from 'lodash'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useWaitForActiveUser } from '~/lib/auth/composables/activeUser'
import { useAuthManager } from '~/lib/auth/composables/auth'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useTableInteractions } from '~/composables/core/tables/interactions/useTableInteractions'
import { useTableInitialization } from '~/composables/core/tables/initialization/useTableInitialization'
import { useTableCategories } from '~/composables/core/tables/categories/useTableCategories'
import { useBIMElements } from '~/composables/core/tables/state/useBIMElements'
import { useParameterStore } from '~/composables/core/parameters/store'
import type { ElementData, SelectedParameter } from '~/composables/core/types'
import type { TableSettings } from '~/composables/core/tables/store/types'
import type { ColumnVisibilityPayload } from '~/composables/core/types/tables/table-events'
import { useTablesState } from '~/composables/settings/tables/useTablesState'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import ScheduleMainView from './components/ScheduleMainView.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import CategoryMenu from '~/components/core/tables/menu/CategoryMenu.vue'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  ViewerNode,
  WorldTreeRoot
} from '~/composables/core/types/viewer/viewer-types'
import { isValidDataState } from '~/composables/core/types/state'
import { isValidTableState } from '~/composables/core/types/tables/table-state'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'
import { useApolloClient, provideApolloClient } from '@vue/apollo-composable'
import { parentCategories, childCategories } from '~/composables/core/config/categories'
import ScheduleTableHeader from './components/ScheduleTableHeader.vue'

// Type-safe array utilities
function safeArrayFrom<T>(value: T[] | undefined | null): T[] {
  return value ? Array.from(value) : []
}

// Type-safe error handling utility
function createSafeError(err: unknown): Error {
  if (err instanceof Error) return err
  if (typeof err === 'string') return new Error(err)
  return new Error('An unknown error occurred')
}

// Type-safe object utilities
function safeObjectEntries<T extends Record<string, unknown>>(
  obj: T | undefined | null
): [string, T[keyof T]][] {
  if (!obj) return []
  return Object.entries(obj) as [string, T[keyof T]][]
}

// Initialize systems
const debug = useDebug()
const store = useStore()
const parameterStore = useParameterStore()
const tablesState = useTablesState()
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
const showCategoryOptions = ref(false)
const initializationAttempted = ref(false)

// Category handlers
async function handleCategoryUpdate(payload: {
  type: 'parent' | 'child'
  categories: string[]
}) {
  try {
    debug.log(DebugCategories.CATEGORIES, 'Category update', payload)

    if (payload.type === 'parent') {
      store.setParentCategories(payload.categories)
    } else {
      store.setChildCategories(payload.categories)
    }

    await elementsData.initializeData()
  } catch (err) {
    handleError(err)
  }
}

async function handleTableChange() {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table change requested')
    await elementsData.initializeData()
  } catch (err) {
    handleError(err)
  }
}

// Table operations handlers
async function handleSelectedTableIdUpdate(tableId: string) {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table selection changed', { tableId })

    // Update interactions state
    _interactions.state.value = {
      ..._interactions.state.value,
      selectedTableId: tableId,
      // For new table, use default name
      tableName: !tableId ? 'New Table' : _interactions.state.value.tableName
    }

    // If selecting existing table, get its settings
    if (tableId) {
      const selectedTable = tablesState.getSelectedTable()
      if (selectedTable) {
        // Update with table settings
        _interactions.state.value = {
          ..._interactions.state.value,
          tableName: selectedTable.name,
          currentTable: selectedTable,
          selectedParentCategories:
            selectedTable.categoryFilters.selectedParentCategories,
          selectedChildCategories: selectedTable.categoryFilters.selectedChildCategories
        }

        // Update columns through store
        await store.lifecycle.update({
          currentTableColumns: selectedTable.parentColumns,
          currentDetailColumns: selectedTable.childColumns
        })
      }
    }

    // Update store
    await store.lifecycle.update({
      selectedTableId: tableId,
      tableName: _interactions.state.value.tableName
    })

    // Initialize data with new settings
    await elementsData.initializeData()
  } catch (err) {
    handleError(err)
  }
}

async function handleTableNameUpdate(name: string) {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Table name changed', { name })

    // Update interactions state
    _interactions.state.value = {
      ..._interactions.state.value,
      tableName: name
    }

    // Update store
    await store.lifecycle.update({ tableName: name })
  } catch (err) {
    handleError(err)
  }
}

async function handleSaveTable() {
  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Saving table')
    await _interactions.handleSaveTable()

    // Reload tables after save
    await tablesState.loadTables()

    // Update store with latest data
    const currentTable = tablesState.getSelectedTable()
    if (currentTable) {
      // Update basic table info
      await store.lifecycle.update({
        selectedTableId: currentTable.id,
        tableName: currentTable.name
      })

      // Update table store with columns
      await tableStore.updateColumns(
        currentTable.parentColumns,
        currentTable.childColumns
      )
    }
  } catch (err) {
    handleError(err)
  }
}

// Computed properties
const hasChanges = computed(() => {
  const currentTableId = _interactions.state.value.selectedTableId
  if (!currentTableId) return false

  const currentTable = tablesState.getSelectedTable()
  if (!currentTable) return false

  const originalTable = tablesState.originalTables.value[currentTableId]
  if (!originalTable) return true // New table

  return (
    currentTable.name !== originalTable.name ||
    !isEqual(
      categories.selectedParentCategories.value,
      originalTable.categoryFilters.selectedParentCategories
    ) ||
    !isEqual(
      categories.selectedChildCategories.value,
      originalTable.categoryFilters.selectedChildCategories
    ) ||
    !isEqual(store.currentTableColumns.value, originalTable.parentColumns) ||
    !isEqual(store.currentDetailColumns.value, originalTable.childColumns)
  )
})

// Initialize data composables with category refs
const categories = useTableCategories({
  initialState: {
    selectedParentCategories: [],
    selectedChildCategories: []
  },
  onUpdate: async (state) => {
    debug.log(DebugCategories.CATEGORIES, 'Categories updated', state)
    await store.lifecycle.update({
      selectedParentCategories: state.selectedParentCategories,
      selectedChildCategories: state.selectedChildCategories
    })
    await elementsData.initializeData()
  },
  onError: (err) => updateErrorState(createSafeError(err))
})

const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategories,
  selectedChildCategories: categories.selectedChildCategories
})

// Safe computed properties from state with proper type checking
const parentElements = computed<ElementData[]>(() => {
  const state = elementsData.state.value
  if (!isValidDataState(state)) return []
  return safeArrayFrom(state.parentElements)
})

const childElements = computed<ElementData[]>(() => {
  const state = elementsData.state.value
  if (!isValidDataState(state)) return []
  return safeArrayFrom(state.childElements)
})

// Convert TableSettings to TableSettings
const _currentTable = computed(() => {
  const current = tableStore.currentTable.value
  if (!current) return null

  return {
    ...current,
    lastUpdateTimestamp: tableStore.lastUpdated.value
  }
})

// Initialize core composables
const tableStore = useTableStore()
const { initComponent } = useTableInitialization({
  store: tableStore
})

// Expose necessary functions
defineExpose({
  handleError: (err: unknown) => updateErrorState(createSafeError(err)),
  handleTableDataUpdate,
  handleColumnVisibilityChange
})

const _interactions = useTableInteractions({
  store,
  state: {
    selectedTableId: store.selectedTableId.value || 'default',
    tableName: store.tableName.value || 'Default Table',
    currentTable: null,
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  initComponent,
  handleError: (err) => handleError(createSafeError(err))
})

// Loading state management
const { isLoading, currentPhase, transitionPhase, validateData } = useLoadingState()

// Computed properties for component state
const isInitialized = computed(() => currentPhase.value === 'complete')

// Handler functions with type safety
function handleTableDataUpdate(): void {
  updateErrorState(null)
}

// Type guard for SelectedParameter
function isSelectedParameter(value: unknown): value is SelectedParameter {
  if (!value || typeof value !== 'object') return false
  const param = value as { id?: unknown; visible?: unknown }
  return typeof param.id === 'string' && typeof param.visible === 'boolean'
}

async function handleParameterVisibilityChange(
  parameter: SelectedParameter
): Promise<void> {
  try {
    // Validate parameter
    if (!isSelectedParameter(parameter)) {
      throw new Error('Invalid parameter object')
    }

    const { id, visible } = parameter
    debug.log(DebugCategories.PARAMETERS, 'Parameter visibility changed', {
      id,
      visible
    })

    // Get current columns
    const parentColumns = tableStore.currentTable.value?.parentColumns || []

    // Update parameter visibility in table store
    await tableStore.updateColumns(
      parentColumns.map((col) => ({
        ...col,
        visible: col.id === id ? visible : col.visible,
        parameter: {
          ...col.parameter,
          visible: col.id === id ? visible : col.parameter.visible
        }
      })),
      tableStore.currentTable.value?.childColumns || []
    )

    debug.log(DebugCategories.PARAMETERS, 'Parameter visibility updated in stores')
  } catch (err) {
    handleError(err)
  }
}

function isValidTable(table: unknown): table is TableSettings {
  if (!table || typeof table !== 'object') return false
  const candidate = table as { id?: unknown }
  return typeof candidate.id === 'string'
}

async function handleColumnVisibilityChange(
  payload: ColumnVisibilityPayload
): Promise<void> {
  try {
    debug.log(DebugCategories.COLUMNS, 'Column visibility changed', {
      field: payload.column.id,
      visible: payload.visible
    })

    // Update column visibility in table store
    await tableStore.updateColumns(
      tableStore.currentTable.value?.parentColumns.map((col) => ({
        ...col,
        visible: col.id === payload.column.id ? payload.visible : col.visible,
        parameter: {
          ...col.parameter,
          visible:
            col.id === payload.column.id ? payload.visible : col.parameter.visible
        }
      })) || [],
      tableStore.currentTable.value?.childColumns.map((col) => ({
        ...col,
        visible: col.id === payload.column.id ? payload.visible : col.visible,
        parameter: {
          ...col.parameter,
          visible:
            col.id === payload.column.id ? payload.visible : col.parameter.visible
        }
      })) || []
    )

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
        hasTable: !!tableStore.currentTable.value
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
      hasTable: !!tableStore.currentTable.value
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

    // 2. Initialize core store
    transitionPhase('core_store')
    await store.lifecycle.init()
    if (!store.initialized.value) throw new Error('Core store failed to initialize')

    // 3. Initialize parameter store
    transitionPhase('parameter_store')
    await parameterStore.init()
    if (!parameterStore.state.value.initialized) {
      throw new Error('Parameter store failed to initialize')
    }

    // 4. Initialize table store
    transitionPhase('table_store')
    await initComponent.initialize()
    if (!tableStore.currentTable.value) {
      throw new Error('Table store failed to initialize')
    }

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
    const tablesResponse = await tablesState.loadTables()
    const tablesList = isValidTableState(tablesResponse)
      ? processTablesList(tablesResponse.state.value.tables)
      : []

    await elementsData.initializeData()
    if (elementsData.hasError.value) {
      throw new Error('Failed to initialize element data')
    }

    // Update store state
    await store.lifecycle.update({
      tablesArray: tablesList,
      selectedTableId:
        tablesList[0]?.id || tableStore.currentTable.value?.id || 'default',
      tableName:
        tablesList[0]?.name || tableStore.currentTable.value?.name || 'Default Table',
      selectedParentCategories: parentCategories,
      selectedChildCategories: childCategories
    })

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
    const hasTable = !!tableStore.currentTable.value
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
    const error = createSafeError(err)
    debug.error(DebugCategories.ERROR, 'Initialization failed', error)

    // Handle auth errors
    if (error.message.toLowerCase().includes('auth')) {
      const { logout } = useAuthManager({
        deferredApollo: () => undefined
      })
      await logout({ skipToast: true })
      return
    }

    transitionPhase('error', error)
    updateErrorState(error)
  } finally {
    initializationAttempted.value = true
  }
})

// Helper to process tables list
function processTablesList(tables: unknown) {
  if (!tables) return []

  type TablesType = Record<string, TableSettings>
  return safeObjectEntries<TablesType>(tables as TablesType)
    .filter((entry): entry is [string, TableSettings] => isValidTable(entry[1]))
    .filter(([_, table]) => table.id !== 'defaultTable')
    .map(([_, table]) => ({
      id: table.id,
      name: table.name || 'Unnamed Table'
    }))
}
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
