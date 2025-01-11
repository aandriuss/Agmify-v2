<template>
  <div>
    <!-- Loading state -->
    <div v-if="!isInitialized || isLoading" class="p-4 text-center">
      <span class="text-gray-500">Loading...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="loadingError" class="p-4 text-center text-red-500">
      Error loading column manager: {{ loadingError?.message }}
    </div>

    <!-- Main content -->
    <div v-else class="h-full flex flex-col">
      <div class="flex flex-col gap-2">
        <!-- View selector -->
        <TabSelector
          :model-value="columnManager.currentView.value"
          @update:model-value="handleViewChange"
        />

        <!-- Lists container -->
        <div class="flex gap-1 h-[400px]">
          <!-- Available Parameters Panel -->
          <div
            class="flex-1 border rounded flex flex-col overflow-hidden bg-background"
          >
            <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
              <h3 class="font-medium text-sm">Available Parameters</h3>
              <FormButton
                text
                size="sm"
                color="subtle"
                :icon-right="
                  coreStore.showCategoryOptions.value ? ChevronUpIcon : ChevronDownIcon
                "
                @click="toggleFilterOptions"
              >
                Filter Options
              </FormButton>
            </div>

            <EnhancedColumnList
              :key="`available-${columnManager.currentView.value}-${listRefreshKey}`"
              :items="columnManager.availableParameters.value"
              mode="available"
              :show-filter-options="coreStore.showCategoryOptions.value"
              :search-term="searchTerm"
              :is-grouped="isGrouped"
              :sort-by="sortBy"
              :drop-position="dropState.dropPosition"
              @update:search-term="handleSearchUpdate"
              @update:is-grouped="handleGroupingUpdate"
              @update:sort-by="handleSortUpdate"
              @add="handleAdd"
              @remove="handleRemove"
              @drag-start="handleDragStart"
              @drag-end="handleDragEnd"
              @drag-enter="handleDragEnter"
              @drop="handleDrop"
              @visibility-change="handleVisibilityChange"
            />
          </div>

          <!-- Active Columns Panel -->
          <div
            class="flex-1 border rounded flex flex-col overflow-hidden bg-background"
          >
            <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
              <h3 class="font-medium text-sm">Active Columns</h3>
              <div class="flex items-center gap-1 text-sm">
                <span
                  v-if="columnManager.activeColumns.value.length"
                  class="text-gray-500"
                >
                  {{
                    columnManager.activeColumns.value.filter((col) => col?.visible)
                      .length
                  }}/{{ columnManager.activeColumns.value.length }}
                  visible
                </span>
                <Button
                  v-if="hasHiddenColumns"
                  icon="pi pi-eye"
                  text
                  severity="secondary"
                  size="small"
                  @click="showAllColumns"
                >
                  Show All
                </Button>
              </div>
            </div>

            <EnhancedColumnList
              :key="`active-${columnManager.currentView.value}-${listRefreshKey}`"
              :items="columnManager.activeColumns.value"
              mode="active"
              :show-filter-options="false"
              :drop-position="dropState.dropPosition"
              @add="handleAdd"
              @remove="handleRemove"
              @drag-start="handleDragStart"
              @drag-end="handleDragEnd"
              @drag-enter="handleDragEnter"
              @drop="handleDrop"
              @visibility-change="handleVisibilityChange"
              @reorder="handleReorder"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import type { FormButton } from '@speckle/ui-components'
import Button from 'primevue/button'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'
import TabSelector from './TabSelector.vue'
import EnhancedColumnList from './shared/EnhancedColumnList.vue'
import { useColumnManager } from '~/components/viewer/components/tables/DataTable/composables/columns/useColumnManager'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { useStore } from '~/composables/core/store'
import type {
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types/parameters/parameter-states'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

import type { TableColumn } from '~/composables/core/types'

// Helper to get item identifier
function getItemId(
  item: AvailableBimParameter | AvailableUserParameter | TableColumn
): string {
  return 'field' in item ? item.field : item.id
}

// Helper to determine if item is a Parameter
function isParameter(
  item: AvailableBimParameter | AvailableUserParameter | TableColumn
): item is AvailableBimParameter | AvailableUserParameter {
  return 'id' in item && !('field' in item)
}

// Helper to determine if item is a Column
function isColumn(
  item: AvailableBimParameter | AvailableUserParameter | TableColumn
): item is TableColumn {
  return 'field' in item
}

// Props and Emits
interface Props {
  open: boolean
  tableId: string
  tableName: string
}

const props = defineProps<Props>()

// Stores and Composables
const tableStore = useTableStore()
const parameterStore = useParameterStore()
const coreStore = useStore()

// State
const isInitialized = ref(false)
const loadingError = ref<Error | null>(null)
const listRefreshKey = ref(0)
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')

// Column Manager
const columnManager = useColumnManager({
  tableId: props.tableId
})

// Drop State
interface DropState {
  dragging: string | null
  sourceList: 'parent' | 'child' | null
  sourceIndex: number | null
  targetIndex: number | null
  dropPosition: 'above' | 'below' | null
}

const dropState = reactive<DropState>({
  dragging: null,
  sourceList: null,
  sourceIndex: null,
  targetIndex: null,
  dropPosition: null
})

// Computed
const isLoading = computed(
  () => tableStore.isLoading.value || parameterStore.isProcessing.value
)

const hasHiddenColumns = computed(() =>
  columnManager.activeColumns.value.some((col) => !col.visible)
)

// Event Handlers
const handleViewChange = (view: 'parent' | 'child') => {
  columnManager.setView(view)
  listRefreshKey.value++
}

const handleSearchUpdate = (value: string) => {
  searchTerm.value = value
}

const handleGroupingUpdate = (value: boolean) => {
  isGrouped.value = value
}

const handleSortUpdate = (value: string) => {
  switch (value) {
    case 'name':
    case 'category':
    case 'type':
    case 'fixed':
      sortBy.value = value
      break
    default:
      break
  }
}

const toggleFilterOptions = () => {
  coreStore.setShowCategoryOptions(!coreStore.showCategoryOptions.value)
}

const handleAdd = async (
  item: AvailableBimParameter | AvailableUserParameter | TableColumn
) => {
  if (!isParameter(item)) return

  try {
    await columnManager.handleColumnOperation({
      type: 'add',
      parameter: item
    })
    listRefreshKey.value++
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to add column')
    loadingError.value = error
  }
}

const handleRemove = async (
  item: AvailableBimParameter | AvailableUserParameter | TableColumn
) => {
  if (!isColumn(item)) return

  try {
    await columnManager.handleColumnOperation({
      type: 'remove',
      column: item
    })
    listRefreshKey.value++
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to remove column')
    loadingError.value = error
  }
}

const handleReorder = async (fromIndex: number, toIndex: number) => {
  try {
    await columnManager.handleColumnOperation({
      type: 'reorder',
      fromIndex,
      toIndex
    })
    listRefreshKey.value++
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to reorder columns')
    loadingError.value = error
  }
}

const handleVisibilityChange = async (
  item: AvailableBimParameter | AvailableUserParameter | TableColumn,
  visible: boolean
) => {
  if (!isColumn(item)) return

  try {
    await columnManager.handleColumnOperation({
      type: 'visibility',
      column: item,
      visible
    })
    listRefreshKey.value++
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to update visibility')
    loadingError.value = error
  }
}

const handleDragStart = (
  event: DragEvent,
  item: AvailableBimParameter | AvailableUserParameter | TableColumn,
  index: number
) => {
  dropState.dragging = getItemId(item)
  dropState.sourceList = columnManager.currentView.value
  dropState.sourceIndex = index
}

const handleDragEnd = () => {
  dropState.dragging = null
  dropState.sourceList = null
  dropState.sourceIndex = null
  dropState.targetIndex = null
  dropState.dropPosition = null
}

const handleDragEnter = (event: DragEvent, index: number) => {
  if (!event.currentTarget) return

  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropState.targetIndex = index
  dropState.dropPosition = mouseY < threshold ? 'above' : 'below'
}

const handleDrop = async (event: DragEvent, targetIndex?: number) => {
  if (!dropState.dragging || targetIndex === undefined) return

  try {
    const sourceIndex = columnManager.activeColumns.value.findIndex(
      (col) => getItemId(col) === dropState.dragging
    )

    if (sourceIndex !== -1) {
      await handleReorder(sourceIndex, targetIndex)
    } else {
      const sourceItem = columnManager.availableParameters.value.find(
        (p) => getItemId(p) === dropState.dragging
      )
      if (sourceItem && isParameter(sourceItem)) {
        await handleAdd(sourceItem)
      }
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to handle drop')
    loadingError.value = error
  } finally {
    handleDragEnd()
  }
}

const showAllColumns = async () => {
  try {
    const promises = columnManager.activeColumns.value
      .filter((col) => !col.visible)
      .map((col) => handleVisibilityChange(col, true))

    await Promise.all(promises)
    listRefreshKey.value++
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to show all columns')
    loadingError.value = error
  }
}

// Initialization
onMounted(async () => {
  try {
    debug.startState(DebugCategories.INITIALIZATION, 'Initializing column manager')

    // Initialize parameter store first
    if (!parameterStore.state.value.initialized) {
      await parameterStore.init()
    }

    // Then load and initialize table
    await tableStore.loadTable(props.tableId)

    // Verify both stores are ready
    if (!parameterStore.state.value.initialized) {
      throw new Error('Parameter store failed to initialize')
    }

    if (!tableStore.computed.currentTable.value) {
      throw new Error('Table failed to load')
    }

    isInitialized.value = true
    debug.completeState(DebugCategories.INITIALIZATION, 'Column manager initialized')
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Failed to initialize')
    debug.error(DebugCategories.INITIALIZATION, 'Failed to initialize:', error)
    loadingError.value = error
  }
})
</script>

<style scoped>
.bg-background {
  background-color: white;
}
</style>
