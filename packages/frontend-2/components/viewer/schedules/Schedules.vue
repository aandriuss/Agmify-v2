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

// Safe computed properties from state
const parentElements = computed<ElementData[]>(() => {
  if (!elementsData.state.value) return []
  return safeArrayFrom(elementsData.state.value.parentElements)
})

const childElements = computed<ElementData[]>(() => {
  if (!elementsData.state.value) return []
  return safeArrayFrom(elementsData.state.value.childElements)
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

// Initialize table state
onMounted(async () => {
  await initComponent.update({
    selectedTableId: '',
    tableName: '',
    selectedParentCategories: parentCategories,
    selectedChildCategories: childCategories
  })
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

// Loading state - handle initialization and data loading
const isLoading = computed(() => {
  // Check initialization states first
  if (!store.initialized.value || !parameterStore.state.value.initialized) {
    return true
  }

  // Check if we're actively loading
  if (elementsData.state.value?.loading || parameterStore.isProcessing.value) {
    return true
  }

  // If initialized but no data, we're not loading
  return false
})

const isInitialized = computed(() => store.initialized.value ?? false)

const isUpdating = computed(() => elementsData.state.value.loading)

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

    // Update parameter visibility in both stores
    await Promise.all([
      parameterStore.updateParameterVisibility(
        payload.column.parameter.id,
        payload.visible,
        payload.column.parameter.kind === 'bim'
      ),
      tableStore.updateColumns(
        tableStore.currentTable.value?.parentColumns.map((col) => ({
          ...col,
          visible: col.id === payload.column.id ? payload.visible : col.visible
        })) || [],
        tableStore.currentTable.value?.childColumns.map((col) => ({
          ...col,
          visible: col.id === payload.column.id ? payload.visible : col.visible
        })) || []
      )
    ])

    debug.log(DebugCategories.COLUMNS, 'Column visibility updated in stores')
  } catch (err) {
    updateErrorState(createSafeError(err))
  }
}

// Type-safe error handling
function updateErrorState(newError: Error | null): void {
  const currentError = error.value
  const shouldUpdate =
    !currentError || !newError || currentError.message !== newError.message

  if (shouldUpdate) {
    error.value = newError
  }

  if (newError) {
    debug.error(DebugCategories.ERROR, 'Schedule error:', {
      name: newError.name,
      message: newError.message,
      stack: newError.stack
    })
  }
}

function handleError(err: unknown): void {
  updateErrorState(createSafeError(err))
}

onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    // 1. Initialize core store first
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing core store')
    await store.lifecycle.init()
    debug.log(DebugCategories.STATE, 'Core store initialized')

    // 2. Wait for world tree data and initialize BIM elements
    debug.startState(DebugCategories.INITIALIZATION, 'Waiting for world tree data')
    await new Promise<void>((resolve) => {
      if (init.ref.value && worldTree.value) {
        resolve()
        return
      }
      const unwatch = watch(
        () => ({ init: init.ref.value, tree: worldTree.value }),
        ({ init, tree }) => {
          if (init && tree) {
            unwatch()
            resolve()
          }
        },
        { immediate: true }
      )
    })

    if (!worldTree.value) {
      throw new Error('World tree not available after initialization')
    }

    // Initialize BIM elements with world tree
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: hasValidChildren(worldTree.value)
          ? worldTree.value._root.children
          : []
      }
    }

    debug.log(DebugCategories.INITIALIZATION, 'Initializing BIM elements', {
      hasChildren: hasValidChildren(worldTree.value),
      childCount: hasValidChildren(worldTree.value)
        ? worldTree.value._root.children.length
        : 0
    })

    await bimElements.initializeElements(treeRoot)

    // Verify BIM elements were loaded
    if (!bimElements.allElements.value?.length) {
      throw new Error('No BIM elements available after initialization')
    }

    debug.log(DebugCategories.INITIALIZATION, 'BIM elements initialized', {
      count: bimElements.allElements.value.length,
      categories: Array.from(
        new Set(bimElements.allElements.value.map((el) => el.category))
      )
    })

    // 3. Initialize parameter store and process parameters
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing parameter store')
    await parameterStore.init()

    // Process parameters from BIM elements
    debug.log(DebugCategories.PARAMETERS, 'Processing BIM elements', {
      count: bimElements.allElements.value.length,
      sampleElement: {
        id: bimElements.allElements.value[0].id,
        category: bimElements.allElements.value[0].category,
        parameterCount: Object.keys(bimElements.allElements.value[0].parameters || {})
          .length
      }
    })

    await parameterStore.processParameters(bimElements.allElements.value)
    await elementsData.initializeData()

    // Verify parameters were processed
    if (
      !parameterStore.parentRawParameters.value?.length &&
      !parameterStore.childRawParameters.value?.length
    ) {
      throw new Error('No parameters available after processing')
    }

    debug.log(DebugCategories.STATE, 'Parameter store initialized', {
      parameters: {
        parent: {
          raw: parameterStore.parentRawParameters.value.length,
          available: {
            bim: parameterStore.parentAvailableBimParameters.value.length,
            user: parameterStore.parentAvailableUserParameters.value.length
          }
        },
        child: {
          raw: parameterStore.childRawParameters.value.length,
          available: {
            bim: parameterStore.childAvailableBimParameters.value.length,
            user: parameterStore.childAvailableUserParameters.value.length
          }
        }
      }
    })

    // 3. Load and initialize tables with processed parameters
    debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
    await tablesState.loadTables()
    const tables = tablesState.state.value?.tables

    // Use default table if no tables loaded
    if (!tables) {
      debug.log(DebugCategories.INITIALIZATION, 'Using default table')
      await initComponent.update({
        selectedTableId: 'default',
        tableName: 'Default Table',
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      })
    } else {
      // Process existing tables
      type TablesType = Record<string, TableSettings>
      const tablesList = safeObjectEntries<TablesType>(tables as TablesType)
        .filter((entry): entry is [string, TableSettings] => isValidTable(entry[1]))
        .filter(([_, table]) => table.id !== 'defaultTable')
        .map(([_, table]) => ({
          id: table.id,
          name: table.name || 'Unnamed Table'
        }))

      // Update store with tables
      await store.lifecycle.update({ tablesArray: tablesList })

      // Select table
      const tableIdToSelect = tablesList.length > 0 ? tablesList[0].id : 'default'
      await initComponent.update({
        selectedTableId: tableIdToSelect,
        tableName: '',
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      })
    }

    // 3. Initialize table component
    await initComponent.initialize()

    // 4. Update core store with current table data
    const currentTable = tableStore.currentTable.value
    if (currentTable) {
      await store.lifecycle.update({
        currentTableColumns: currentTable.parentColumns,
        currentDetailColumns: currentTable.childColumns
      })
    }

    debug.log(DebugCategories.STATE, 'Table initialization complete', {
      currentTable: currentTable?.id,
      columns: {
        parent: currentTable?.parentColumns.length || 0,
        child: currentTable?.childColumns.length || 0
      }
    })

    debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to initialize schedules', err)
    updateErrorState(createSafeError(err))
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
