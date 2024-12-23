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
                      categories.selectedParentCategories.value.includes(category)
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
                      categories.selectedChildCategories.value.includes(category)
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
            :selected-table-id="tableStore.currentTable.value?.id || ''"
            :current-table="_currentTable"
            :is-initialized="isInitialized"
            :table-name="tableStore.currentTable.value?.name || ''"
            :current-table-id="tableStore.currentTable.value?.id || ''"
            :table-key="tableStore.lastUpdated.value.toString()"
            :error="error"
            :parent-base-columns="tableStore.currentTable.value?.parentColumns || []"
            :parent-available-columns="
              parameterStore.parentAvailableBimParameters.value
            "
            :parent-visible-columns="tableStore.currentTable.value?.parentColumns || []"
            :child-base-columns="tableStore.currentTable.value?.childColumns || []"
            :child-available-columns="parameterStore.childAvailableBimParameters.value"
            :child-visible-columns="tableStore.currentTable.value?.childColumns || []"
            :schedule-data="store.scheduleData.value || []"
            :evaluated-data="store.evaluatedData.value || []"
            :table-data="store.tableData.value || []"
            :is-loading="isLoading"
            :is-loading-additional-data="isUpdating"
            :has-selected-categories="categories.hasSelectedCategories.value"
            :selected-parent-categories="categories.selectedParentCategories.value"
            :selected-child-categories="categories.selectedChildCategories.value"
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

function safeArrayIncludes<T>(array: T[] | undefined | null, value: T): boolean {
  return array ? array.includes(value) : false
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

// Initialize refs first
const error = ref<Error | null>(null)
const showCategoryOptions = ref(false)

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

// Initialize core systems
const debug = useDebug()
const store = useStore()
const parameterStore = useParameterStore()
const tablesState = useTablesState()
const tableStore = useTableStore()

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

// Initialize element data with proper parameter extraction
const elementsData = useElementsData({
  selectedParentCategories: categories.selectedParentCategories,
  selectedChildCategories: categories.selectedChildCategories
})

// Initialize BIM elements with reactive categories
const bimElements = useBIMElements({
  childCategories: categories.selectedChildCategories.value
})

// Get viewer state
const {
  viewer: {
    metadata: { worldTree },
    init
  }
} = useInjectedViewerState()

// Initialize table flow
const { initComponent } = useTableInitialization({
  store: tableStore
})

// Wait for world tree to be populated with retry logic
async function waitForWorldTree(maxAttempts = 5, delayMs = 1000): Promise<void> {
  let attempts = 0
  while (attempts < maxAttempts) {
    if (hasValidChildren(worldTree.value)) {
      debug.log(DebugCategories.DATA, 'World tree ready', {
        exists: !!worldTree.value,
        hasRoot: !!worldTree.value?._root,
        childrenCount: worldTree.value?._root?.children?.length || 0
      })
      return
    }

    attempts++
    if (attempts < maxAttempts) {
      debug.log(DebugCategories.DATA, `Waiting for world tree (attempt ${attempts})`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
  throw new Error('World tree data not available after maximum attempts')
}

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

// Safe computed properties from element data
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

// Loading state - only show loading when we have no data
const isLoading = computed(() => {
  const hasData =
    (store.scheduleData.value?.length ?? 0) > 0 ||
    (store.tableData.value?.length ?? 0) > 0
  return (
    !hasData ||
    bimElements.isLoading.value ||
    parameterStore.isProcessing.value ||
    elementsData.state.value?.loading
  )
})

const isInitialized = computed(() => store.initialized.value ?? false)

const isUpdating = computed(
  () => bimElements.isLoading.value || elementsData.state.value?.loading
)

// Category toggle handlers with type safety
const toggleParentCategory = async (category: string) => {
  const current = safeArrayFrom(categories.selectedParentCategories.value)
  const index = current.indexOf(category)
  if (index === -1) {
    current.push(category)
  } else {
    current.splice(index, 1)
  }
  await store.setParentCategories(current)
  if (hasValidChildren(worldTree.value)) {
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: worldTree.value._root.children
      }
    }
    await bimElements.initializeElements(treeRoot)
    await elementsData.initializeData()
  }
}

const toggleChildCategory = async (category: string) => {
  const current = safeArrayFrom(categories.selectedChildCategories.value)
  const index = current.indexOf(category)
  if (index === -1) {
    current.push(category)
  } else {
    current.splice(index, 1)
  }
  await store.setChildCategories(current)
  if (hasValidChildren(worldTree.value)) {
    const treeRoot: WorldTreeRoot = {
      _root: {
        children: worldTree.value._root.children
      }
    }
    await bimElements.initializeElements(treeRoot)
    await elementsData.initializeData()
  }
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

function handleError(err: unknown): void {
  updateErrorState(createSafeError(err))
}

onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing schedules')

    try {
      // 1. Initialize stores first
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing stores')
      await Promise.all([store.lifecycle.init(), parameterStore.init()])
      debug.log(DebugCategories.STATE, 'Stores initialized')

      // 2. Wait for viewer initialization first
      debug.log(DebugCategories.INITIALIZATION, 'Waiting for viewer initialization')
      await init.promise
      debug.log(DebugCategories.INITIALIZATION, 'Viewer initialized')

      // 3. Then wait for world tree to be populated with retry logic
      debug.log(DebugCategories.INITIALIZATION, 'Waiting for world tree')
      await waitForWorldTree()
      debug.log(DebugCategories.INITIALIZATION, 'World tree initialized')

      // 4. Verify parameter store initialization
      if (parameterStore.error.value) {
        throw new Error('Parameter store failed to initialize')
      }

      // 5. Initialize BIM elements with retry logic
      debug.startState(DebugCategories.INITIALIZATION, 'Initializing BIM elements')
      let initializeSuccess = false
      let attempts = 0
      const maxAttempts = 3

      while (!initializeSuccess && attempts < maxAttempts) {
        try {
          attempts++
          debug.log(
            DebugCategories.INITIALIZATION,
            `BIM elements initialization attempt ${attempts}`
          )

          const treeRoot: WorldTreeRoot = {
            _root: {
              children: hasValidChildren(worldTree.value)
                ? worldTree.value._root.children
                : []
            }
          }

          // Initialize BIM elements and element data
          await bimElements.initializeElements(treeRoot)
          await elementsData.initializeData()

          // Verify initialization
          if (!bimElements.allElements.value?.length) {
            throw new Error('No BIM elements found after initialization')
          }

          // If we get here, initialization was successful
          initializeSuccess = true
          debug.log(
            DebugCategories.INITIALIZATION,
            'BIM elements and element data initialized successfully'
          )
        } catch (err) {
          const safeError = createSafeError(err)
          debug.error(
            DebugCategories.ERROR,
            `BIM elements initialization attempt ${attempts} failed:`,
            safeError
          )

          if (attempts === maxAttempts) {
            throw new Error(
              `Failed to initialize BIM elements after ${maxAttempts} attempts: ${safeError.message}`
            )
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }

      // 8. Wait for stores to be updated with processed data
      await new Promise((resolve) => setTimeout(resolve, 0))

      // 9. Load tables
      debug.startState(DebugCategories.INITIALIZATION, 'Loading tables')
      await tablesState.loadTables()

      const tables = tablesState.state.value?.tables
      if (!tables) {
        throw new Error('Failed to load tables')
      }

      // 10. Process tables
      type TablesType = Record<string, TableSettings>
      const tableEntries = safeObjectEntries<TablesType>(tables as TablesType)
      const validTableEntries = tableEntries.filter(
        (entry): entry is [string, TableSettings] => isValidTable(entry[1])
      )
      const filteredEntries = validTableEntries.filter(
        ([_, table]) => table.id !== 'defaultTable'
      )
      const tablesList = filteredEntries.map(([_, table]) => ({
        id: table.id,
        name: table.name || 'Unnamed Table'
      }))

      // 11. Update store with tables
      await store.lifecycle.update({
        tablesArray: tablesList
      })

      // 12. Select table with type safety
      const lastSelectedId = localStorage.getItem('speckle:lastSelectedTableId')
      const tableIdToSelect =
        lastSelectedId &&
        safeArrayIncludes(
          tablesList.map((t) => t.id),
          lastSelectedId
        )
          ? lastSelectedId
          : tablesList.length > 0
          ? tablesList[0].id
          : 'default'

      // 13. Initialize table component with processed data
      await initComponent.update({
        selectedTableId: tableIdToSelect,
        tableName: '',
        selectedParentCategories: parentCategories,
        selectedChildCategories: childCategories
      })

      // 14. Initialize table after data is ready
      await initComponent.initialize()

      debug.completeState(DebugCategories.INITIALIZATION, 'Schedules initialized')
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to initialize:', err)
      throw err
    }
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
