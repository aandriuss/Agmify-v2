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
        loading-message="Loading schedule data..."
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
            :schedule-data="store.scheduleData || []"
            :evaluated-data="store.evaluatedData || []"
            :table-data="store.tableData || []"
            :is-loading="isLoading"
            :is-loading-additional-data="isUpdating"
            :has-selected-categories="categories.hasSelectedCategories"
            :selected-parent-categories="categories.selectedParentCategories"
            :selected-child-categories="categories.selectedChildCategories"
            :show-parameter-manager="_interactions.showParameterManager.value"
            :parent-elements="parentElements"
            :child-elements="childElements"
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
import type { ElementData, DataState } from '~/composables/core/types'
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
import {
  isValidStoreState,
  isValidParameterState
} from '~/composables/core/types/state'
import { isValidTableState } from '~/composables/core/types/tables/table-state'
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

// Type guard for DataState
function isValidDataState(state: unknown): state is DataState {
  if (!state || typeof state !== 'object') return false
  return 'parentElements' in state && 'childElements' in state
}

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

// Loading state - handle initialization and data loading with proper type checking
const isLoading = computed(() => {
  const storeState = store.initialized
  const paramState = parameterStore.state.value
  const elementState = elementsData.state.value

  // Check initialization states first
  if (
    !isValidStoreState(storeState) ||
    !isValidParameterState(paramState) ||
    !paramState.initialized
  ) {
    return true
  }

  // Check if we're actively loading
  if (
    (isValidDataState(elementState) && elementState.loading) ||
    paramState.isProcessing
  ) {
    return true
  }

  // If initialized but no data, we're not loading
  return false
})

const isInitialized = computed(() => {
  const storeState = store.initialized
  return isValidStoreState(storeState) && storeState.value
})

const isUpdating = computed(() => {
  const state = elementsData.state.value
  return isValidDataState(state) && state.loading
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
    const errorDetails = {
      name: newError.name,
      message: newError.message,
      stack: newError.stack
    }
    debug.error(DebugCategories.ERROR, 'Schedule error:', errorDetails)
  }
}

function handleError(err: unknown): void {
  updateErrorState(createSafeError(err))
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

    // 2. Initialize core store
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing core systems')
    await store.lifecycle.init()
    debug.log(DebugCategories.INITIALIZATION, 'Core store initialized')

    // 3. Wait for auth to be ready
    debug.startState(DebugCategories.INITIALIZATION, 'Waiting for auth')
    const waitForUser = useWaitForActiveUser()
    const userResult = await waitForUser()
    if (!userResult?.data?.activeUser) {
      throw new Error('Authentication required')
    }
    debug.log(DebugCategories.INITIALIZATION, 'Auth ready')
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

    // 3. Initialize BIM elements
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: hasValidChildren(worldTree.value)
          ? worldTree.value._root.children
          : []
      }
    }

    debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
    await bimElements.initializeElements(treeRoot)

    if (!bimElements.allElements.value?.length) {
      throw new Error('No BIM elements available after initialization')
    }

    // 4. Initialize parameter store and process parameters
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing parameters')
    await parameterStore.init()

    // Verify BIM elements have parameters before processing
    const elementsWithParams = bimElements.allElements.value.filter(
      (el) => el.parameters && Object.keys(el.parameters).length > 0
    )

    debug.log(DebugCategories.INITIALIZATION, 'Processing parameters', {
      totalElements: bimElements.allElements.value.length,
      elementsWithParams: elementsWithParams.length,
      parameterCount: elementsWithParams.reduce(
        (acc, el) => acc + Object.keys(el.parameters || {}).length,
        0
      )
    })

    if (elementsWithParams.length === 0) {
      throw new Error('No parameters found in BIM elements')
    }

    await parameterStore.processParameters(elementsWithParams)

    // Verify parameters were processed
    const paramCounts = {
      parentRaw: parameterStore.parentRawParameters.value?.length || 0,
      childRaw: parameterStore.childRawParameters.value?.length || 0,
      parentBim: parameterStore.parentAvailableBimParameters.value?.length || 0,
      childBim: parameterStore.childAvailableBimParameters.value?.length || 0
    }

    debug.log(DebugCategories.INITIALIZATION, 'Parameters processed', paramCounts)

    if (paramCounts.parentBim === 0 && paramCounts.childBim === 0) {
      throw new Error('No parameters available after processing')
    }

    // 5. Load and initialize tables
    debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
    const tablesResponse = await tablesState.loadTables()
    const tablesList = isValidTableState(tablesResponse)
      ? processTablesList(tablesResponse.state.value.tables)
      : []

    // 6. Initialize data with processed parameters
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing data')
    await elementsData.initializeData()

    // 7. Update store state
    debug.startState(DebugCategories.STATE, 'Updating store state')
    await store.lifecycle.update({
      tablesArray: tablesList,
      selectedTableId: tablesList.length > 0 ? tablesList[0].id : 'default',
      tableName: tablesList.length > 0 ? tablesList[0].name : 'Default Table',
      selectedParentCategories: parentCategories,
      selectedChildCategories: childCategories
    })

    // 8. Initialize table component
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing table component')
    await initComponent.initialize()

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
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
