<template>
  <ViewerLayoutPanel @close="$emit('close')">
    <template #title>Datasets</template>
    <TableLayout class="viewer-container">
      <template #controls>
        <div class="flex items-center gap-4">
          <FormButton
            text
            size="sm"
            color="subtle"
            :icon-right="showCategoryOptions ? ChevronUpIcon : ChevronDownIcon"
            @click="showCategoryOptions = !showCategoryOptions"
          >
            Category filter options
          </FormButton>
        </div>
      </template>

      <template #actions>
        <div class="flex items-center gap-2">
          <slot name="table-actions" />
        </div>
      </template>

      <LoadingState
        :is-loading="isLoading"
        :error="error"
        :loading-message="loadingMessage"
      >
        <!-- Category Options Section -->
        <div
          v-show="showCategoryOptions"
          class="sticky top-10 px-2 py-2 border-b-2 border-primary-muted bg-foundation"
        >
          <div class="flex flex-row justify-between">
            <!-- Parent Categories -->
            <div class="flex-1 mr-4">
              <span class="text-body-xs text-foreground font-medium mb-2 block">
                Host Categories
              </span>
              <div class="max-h-[200px] overflow-y-auto">
                <div v-for="category in parentCategories" :key="category">
                  <FormButton
                    size="sm"
                    :icon-left="
                      categories.selectedParentCategories.value?.includes(category)
                        ? CheckCircleIcon
                        : CheckCircleIconOutlined
                    "
                    text
                    @click="toggleParentCategory(category)"
                  >
                    {{ category }}
                  </FormButton>
                </div>
              </div>
            </div>

            <!-- Child Categories -->
            <div class="flex-1">
              <span class="text-body-xs text-foreground font-medium mb-2 block">
                Child Categories
              </span>
              <div class="max-h-[200px] overflow-y-auto">
                <div v-for="category in childCategories" :key="category">
                  <FormButton
                    size="sm"
                    :icon-left="
                      categories.selectedChildCategories.value?.includes(category)
                        ? CheckCircleIcon
                        : CheckCircleIconOutlined
                    "
                    text
                    @click="toggleChildCategory(category)"
                  >
                    {{ category }}
                  </FormButton>
                </div>
              </div>
            </div>
          </div>
        </div>

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
            :child-visible-columns="tableStore.currentTable?.value?.childColumns || []"
            :schedule-data="unref(store.scheduleData) || []"
            :evaluated-data="unref(store.evaluatedData) || []"
            :table-data="unref(store.tableData) || []"
            :is-loading="isLoading"
            :is-loading-additional-data="isUpdating"
            :has-selected-categories="categories.hasSelectedCategories"
            :selected-parent-categories="unref(categories.selectedParentCategories)"
            :selected-child-categories="unref(categories.selectedChildCategories)"
            :show-parameter-manager="_interactions.showParameterManager.value"
            :parent-elements="unref(parentElements)"
            :child-elements="unref(childElements)"
            :is-test-mode="false"
            @error="handleError"
            @table-updated="handleTableDataUpdate"
            @column-visibility-change="handleColumnVisibilityChange"
          />
        </div>
      </LoadingState>
    </TableLayout>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
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
import type { ElementData } from '~/composables/core/types'
import type { TableSettings } from '~/composables/core/tables/store/types'
import type { ColumnVisibilityPayload } from '~/composables/core/types/tables/table-events'
import { useTablesState } from '~/composables/settings/tables/useTablesState'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/vue/24/solid'
import { CheckCircleIcon as CheckCircleIconOutlined } from '@heroicons/vue/24/outline'
import ScheduleMainView from './components/ScheduleMainView.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import { useTableStore } from '~/composables/core/tables/store/store'
import type {
  ViewerNode,
  WorldTreeRoot
} from '~/composables/core/types/viewer/viewer-types'
import { isValidDataState } from '~/composables/core/types/state'
import { isValidTableState } from '~/composables/core/types/tables/table-state'
import { useLoadingState } from '~/composables/core/tables/state/useLoadingState'
import { useApolloClient, provideApolloClient } from '@vue/apollo-composable'

// Available categories
const parentCategories = ['Walls', 'Floors', 'Roofs']
const childCategories = [
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

// Initialize data composables with category refs
const categories = useTableCategories({
  initialState: {
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  onUpdate: async (state) => {
    await store.lifecycle.update({
      selectedParentCategories: state.selectedParentCategories,
      selectedChildCategories: state.selectedChildCategories
    })
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
    selectedTableId: '',
    tableName: '',
    currentTable: null,
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  },
  initComponent,
  handleError: (err) => handleError(createSafeError(err))
})

// Loading state
const { loadingMessage, isLoading } = useLoadingState()

const isInitialized = computed(() => {
  const hasScheduleData = store.scheduleData.value?.length > 0
  const hasParameters = parameterStore.parentRawParameters.value?.length > 0
  const storesReady =
    store.state.value.initialized &&
    parameterStore.state.value.initialized &&
    !!tableStore.currentTable.value

  return (
    storesReady && (hasScheduleData || hasParameters) && initializationComplete.value
  )
})

const isUpdating = computed(() => {
  return (
    isInitializing.value ||
    parameterStore.state.value.processing.status === 'processing' ||
    (isValidDataState(elementsData.state.value) && elementsData.state.value.loading)
  )
})

// Category toggle handlers with type safety
const toggleParentCategory = async (category: string) => {
  const current = safeArrayFrom(categories.selectedParentCategories.value)
  const index = current.indexOf(category)
  if (index === -1) {
    current.push(category)
  } else {
    current.splice(index, 1)
  }
  store.setParentCategories(current)
  await elementsData.initializeData()
}

const toggleChildCategory = async (category: string) => {
  const current = safeArrayFrom(categories.selectedChildCategories.value)
  const index = current.indexOf(category)
  if (index === -1) {
    current.push(category)
  } else {
    current.splice(index, 1)
  }
  store.setChildCategories(current)
  await elementsData.initializeData()
}

// Handler functions with type safety
function handleTableDataUpdate(): void {
  updateErrorState(null)
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
        isInitializing: isInitializing.value,
        isInitialized: isInitialized.value,
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
      isInitializing: isInitializing.value,
      isInitialized: isInitialized.value,
      isLoading: isLoading.value,
      hasElements: bimElements.allElements.value?.length || 0,
      hasParameters: parameterStore.parentRawParameters.value?.length || 0,
      hasTable: !!tableStore.currentTable.value
    }
  })
  updateErrorState(error)
}

// Track initialization state
const isInitializing = ref(false)
const initializationComplete = ref(false)

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

onMounted(async () => {
  // Guard against multiple initialization attempts
  if (isInitializing.value || initializationComplete.value) {
    debug.warn(
      DebugCategories.INITIALIZATION,
      'Initialization already in progress or completed'
    )
    return
  }

  try {
    isInitializing.value = true
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    // 1. Initialize Apollo client
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing Apollo client')
    const { client: apolloClient } = useApolloClient()
    if (!apolloClient) {
      throw new Error('Apollo client not initialized')
    }
    provideApolloClient(apolloClient)
    debug.log(DebugCategories.INITIALIZATION, 'Apollo client ready')

    // 2. Initialize stores in correct order with proper timeouts
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing stores')

    // Initialize core store first
    debug.log(DebugCategories.INITIALIZATION, 'Initializing core store')
    await Promise.race([
      store.lifecycle.init(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Core store initialization timeout')), 8000)
      )
    ])

    // Verify core store initialization
    if (!store.initialized.value) {
      throw new Error('Core store failed to initialize')
    }

    debug.log(DebugCategories.INITIALIZATION, 'Core store initialized', {
      initialized: store.initialized.value,
      scheduleData: store.scheduleData.value?.length || 0
    })

    // Initialize parameter store next
    debug.log(DebugCategories.INITIALIZATION, 'Initializing parameter store')
    await Promise.race([
      parameterStore.init(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Parameter store initialization timeout')),
          8000
        )
      )
    ])

    // Verify parameter store initialization
    if (!parameterStore.state.value.initialized) {
      throw new Error('Parameter store failed to initialize')
    }

    debug.log(DebugCategories.INITIALIZATION, 'Parameter store initialized', {
      parentParams: parameterStore.parentRawParameters.value?.length || 0,
      childParams: parameterStore.childRawParameters.value?.length || 0
    })

    // Initialize table store last
    debug.log(DebugCategories.INITIALIZATION, 'Initializing table store')
    await Promise.race([
      initComponent.initialize(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Table store initialization timeout')), 8000)
      )
    ])

    // Verify table store initialization
    if (!tableStore.currentTable.value) {
      throw new Error('Table store failed to initialize')
    }

    debug.log(DebugCategories.INITIALIZATION, 'Table store initialized', {
      tableId: tableStore.currentTable.value.id,
      parameters: {
        parent: tableStore.currentTable.value.selectedParameters?.parent?.length || 0,
        child: tableStore.currentTable.value.selectedParameters?.child?.length || 0
      }
    })

    // 3. Wait for auth to be ready
    debug.startState(DebugCategories.INITIALIZATION, 'Waiting for auth')
    const waitForUser = useWaitForActiveUser()
    const userResult = await waitForUser()
    if (!userResult?.data?.activeUser) {
      throw new Error('Authentication required')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Auth ready')

    // 4. Initialize world tree
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing world tree')
    await waitForWorldTree().catch((err) => {
      debug.error(
        DebugCategories.INITIALIZATION,
        'World tree initialization failed',
        err
      )
      throw err
    })

    if (!worldTree.value) {
      throw new Error('World tree not available after initialization')
    }

    // 5. Initialize BIM elements with world tree
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: hasValidChildren(worldTree.value)
          ? worldTree.value._root.children
          : []
      }
    }

    await bimElements.initializeElements(treeRoot)

    if (!bimElements.allElements.value?.length) {
      throw new Error('No BIM elements found after initialization')
    }

    debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized', {
      total: bimElements.allElements.value.length,
      withParams: bimElements.allElements.value.filter(
        (el) => el.parameters && Object.keys(el.parameters).length > 0
      ).length
    })

    // Process parameters from BIM elements
    const elementsWithParams = bimElements.allElements.value.filter(
      (el) => el.parameters && Object.keys(el.parameters).length > 0
    )

    if (elementsWithParams.length === 0) {
      throw new Error('No parameters found in BIM elements')
    }

    await parameterStore.processParameters(elementsWithParams)

    // Verify parameter processing
    const paramCounts = {
      parentRaw: parameterStore.parentRawParameters.value?.length || 0,
      childRaw: parameterStore.childRawParameters.value?.length || 0,
      parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
      childBim: parameterStore.childAvailableBimParameters.value?.length || 0
    }

    if (paramCounts.parentBim === 0 && paramCounts.childBim === 0) {
      throw new Error('Parameter processing failed - no parameters available')
    }

    debug.log(DebugCategories.INITIALIZATION, 'Parameters processed', paramCounts)

    // 6. Load tables from PostgreSQL
    debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
    const tablesResponse = await tablesState.loadTables()
    const tablesList = isValidTableState(tablesResponse)
      ? processTablesList(tablesResponse.state.value.tables)
      : []

    // 7. Initialize element data
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing element data')
    await elementsData.initializeData()

    // Verify element data initialization
    if (!elementsData.state.value || elementsData.hasError.value) {
      throw new Error('Failed to initialize element data')
    }

    debug.log(DebugCategories.INITIALIZATION, 'Element data initialized', {
      total: elementsData.allElements.value?.length || 0,
      parents: elementsData.state.value.parentElements?.length || 0,
      children: elementsData.state.value.childElements?.length || 0
    })

    // 8. Update and verify store state
    debug.startState(DebugCategories.STATE, 'Updating store state')
    await store.lifecycle.update({
      tablesArray: tablesList,
      selectedTableId:
        tablesList.length > 0
          ? tablesList[0].id
          : tableStore.currentTable.value?.id || 'default',
      tableName:
        tablesList.length > 0
          ? tablesList[0].name
          : tableStore.currentTable.value?.name || 'Default Table',
      selectedParentCategories: parentCategories,
      selectedChildCategories: childCategories
    })

    // Verify final state
    const finalState = {
      storeInitialized: store.initialized.value,
      hasParameters: parameterStore.state.value.initialized,
      hasTable: !!tableStore.currentTable.value,
      hasElements: elementsData.allElements.value?.length || 0,
      parameters: {
        parent: parameterStore.parentRawParameters.value?.length || 0,
        child: parameterStore.childRawParameters.value?.length || 0
      },
      table: {
        id: tableStore.currentTable.value?.id,
        parameters: {
          parent:
            tableStore.currentTable.value?.selectedParameters?.parent?.length || 0,
          child: tableStore.currentTable.value?.selectedParameters?.child?.length || 0
        }
      }
    }

    debug.log(DebugCategories.STATE, 'Final state verification', finalState)

    // Wait for all required states to be ready
    debug.startState(DebugCategories.STATE, 'Waiting for stores to be ready')
    await new Promise<void>((resolve, reject) => {
      let watcherCleanup: (() => void) | undefined = undefined

      const timeout = setTimeout(() => {
        if (watcherCleanup) watcherCleanup()
        reject(new Error('Store initialization timeout'))
      }, 5000)

      const sources = [
        () => store.state.value.initialized,
        () => parameterStore.state.value.initialized,
        () => !!tableStore.currentTable.value,
        () => store.scheduleData.value?.length > 0,
        () => parameterStore.parentRawParameters.value?.length > 0
      ]

      watcherCleanup = watch(
        sources,
        (values) => {
          const [storeInit, paramInit, tableInit, hasSchedule, hasParams] = values
          if (storeInit && paramInit && tableInit && hasSchedule && hasParams) {
            clearTimeout(timeout)
            watcherCleanup?.()
            resolve()
          }
        },
        { immediate: true }
      )
    })

    // Wait for data to be fully ready
    debug.startState(DebugCategories.STATE, 'Waiting for data to be ready')
    await new Promise<void>((resolve, reject) => {
      let watcherCleanup: (() => void) | undefined = undefined

      const timeout = setTimeout(() => {
        if (watcherCleanup) watcherCleanup()
        reject(new Error('Data initialization timeout'))
      }, 5000)

      const sources = [
        () => store.scheduleData.value?.length > 0,
        () => store.tableData.value?.length > 0,
        () => store.evaluatedData.value?.length > 0,
        () => parameterStore.parentRawParameters.value?.length > 0,
        () => (tableStore.currentTable.value?.parentColumns?.length ?? 0) > 0
      ]

      watcherCleanup = watch(
        sources,
        (values) => {
          const [hasSchedule, hasTable, hasEvaluated, hasParams, hasColumns] = values
          if (hasSchedule && hasTable && hasEvaluated && hasParams && hasColumns) {
            clearTimeout(timeout)
            watcherCleanup?.()
            resolve()
          }
        },
        { immediate: true }
      )
    })

    debug.completeState(DebugCategories.INITIALIZATION, 'All data ready')
    initializationComplete.value = true
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to initialize schedules', err)
    const safeError = createSafeError(err)

    // Handle auth errors specifically
    const errorMessage = safeError.message.toLowerCase()
    const isAuthError =
      errorMessage.includes('authentication required') ||
      errorMessage.includes('auth token')

    if (isAuthError) {
      debug.error(DebugCategories.ERROR, 'Authentication error - redirecting to login')
      const { logout } = useAuthManager({
        deferredApollo: () => undefined // No need for Apollo client during logout
      })
      await logout({ skipToast: true })
      return
    }

    updateErrorState(safeError)
  } finally {
    isInitializing.value = false
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
