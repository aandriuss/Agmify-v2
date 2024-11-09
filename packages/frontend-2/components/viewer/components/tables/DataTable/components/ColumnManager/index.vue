<template>
  <div>
    <!-- Loading state -->
    <div v-if="!isInitialized && !loadingError" class="p-4 text-center">
      <span class="text-gray-500">Loading...</span>
    </div>

    <!-- Error state -->
    <div v-else-if="loadingError" class="p-4 text-center text-red-500">
      Error loading column manager: {{ loadingError?.message }}
    </div>

    <!-- Main content -->
    <div v-else class="h-full flex flex-col">
      <LayoutDialog
        :open="props.open"
        :max-width="'lg'"
        :hide-closer="false"
        mode="out-in"
        :title="tableName"
        :buttons="dialogButtons"
        @update:open="$emit('update:open', $event)"
      >
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
                  :icon-right="showFilterOptions ? ChevronUpIcon : ChevronDownIcon"
                  @click="toggleFilterOptions"
                >
                  Filter Options
                </FormButton>
              </div>

              <EnhancedColumnList
                :key="`available-${columnManager.currentView.value}-${listRefreshKey}`"
                :items="columnManager.availableParameters.value"
                mode="available"
                :show-filter-options="showFilterOptions"
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
          <!-- Debug info if in debug mode -->
          <div v-if="debug" class="mt-2 p-2 bg-gray-50 text-xs">
            <div>
              Pending Changes:
              {{ columnManager.columnState.value.pendingChanges?.length }}
            </div>
            <div>Active View: {{ columnManager.currentView.value }}</div>
            <div>Is Updating: {{ columnManager.isUpdating }}</div>
          </div>
        </div>
      </LayoutDialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import {
  LayoutDialog,
  type LayoutDialogButton,
  FormButton
} from '@speckle/ui-components'
import Button from 'primevue/button'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'
import TabSelector from './TabSelector.vue'
import EnhancedColumnList from './shared/EnhancedColumnList.vue'
import type { ColumnDef, ParameterDefinition } from '../../composables/types'
import { useColumnManager } from '~/components/viewer/components/tables/DataTable/composables/columns/useColumnManager'

// Props and Emits
interface Props {
  open: boolean
  tableId: string
  tableName: string
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
  debug?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  debug: false
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:columns': [updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }]
  cancel: []
  apply: []
  'table-updated': [updates: { tableId: string; tableName: string }]
}>()

// State
const isInitialized = ref(false)
const loadingError = ref<Error | null>(null)
const listRefreshKey = ref(0)
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')
const showFilterOptions = ref(false)

// Column Manager
const columnManager = useColumnManager({
  tableId: props.tableId,
  initialParentColumns: props.parentColumns,
  initialChildColumns: props.childColumns,
  availableParentParameters: props.availableParentParameters,
  availableChildParameters: props.availableChildParameters
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
const tableName = computed(() => props.tableName)

const hasHiddenColumns = computed(() =>
  columnManager.activeColumns.value.some((col: ColumnDef) => !col.visible)
)

const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Apply',
    props: {
      submit: false,
      link: false,
      loading: columnManager.isUpdating.value,
      color: 'primary'
    },
    onClick: handleApply
  },
  {
    text: 'Cancel',
    props: {
      submit: false,
      link: false,
      color: 'outline'
    },
    onClick: handleCancel
  }
])

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
  showFilterOptions.value = !showFilterOptions.value
}

const handleAdd = async (item: ParameterDefinition | ColumnDef) => {
  await columnManager.handleColumnOperation({
    type: 'add',
    column: item as ParameterDefinition
  })
  listRefreshKey.value++
}

const handleRemove = async (item: ParameterDefinition | ColumnDef) => {
  await columnManager.handleColumnOperation({
    type: 'remove',
    column: item as ColumnDef
  })
  listRefreshKey.value++
}

const handleReorder = async (fromIndex: number, toIndex: number) => {
  await columnManager.handleColumnOperation({
    type: 'reorder',
    fromIndex,
    toIndex
  })
  listRefreshKey.value++
}

const handleVisibilityChange = async (
  item: ParameterDefinition | ColumnDef,
  visible: boolean
) => {
  await columnManager.handleColumnOperation({
    type: 'visibility',
    column: item as ColumnDef,
    visible
  })
  listRefreshKey.value++
}

const handleDragStart = (
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) => {
  dropState.dragging = item.field
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

  const sourceIndex = columnManager.activeColumns.value.findIndex(
    (col: ColumnDef) => col.field === dropState.dragging
  )

  if (sourceIndex !== -1) {
    await handleReorder(sourceIndex, targetIndex)
  } else {
    const sourceItem = columnManager.availableParameters.value.find(
      (p: ParameterDefinition) => p.field === dropState.dragging
    )
    if (sourceItem) {
      await handleAdd(sourceItem)
    }
  }
  handleDragEnd()
}

const handleCancel = () => {
  try {
    emit('cancel')
    emit('update:open', false)
  } catch (error) {
    if (error instanceof Error) {
      loadingError.value = error
    }
  }
}

const showAllColumns = async () => {
  const promises = columnManager.activeColumns.value
    .filter((col: ColumnDef) => !col.visible)
    .map((col: ColumnDef) => handleVisibilityChange(col, true))

  await Promise.all(promises)
  listRefreshKey.value++
}

const handleApply = async () => {
  try {
    // First save the changes using columnManager
    const result = await columnManager.saveChanges()
    if (!result) {
      throw new Error('Failed to save column changes')
    }

    // Then emit events
    emit('update:columns', {
      parentColumns: result.parentColumns,
      childColumns: result.childColumns
    })

    emit('table-updated', {
      tableId: props.tableId,
      tableName: props.tableName
    })

    emit('apply')
    emit('update:open', false)
  } catch (error) {
    if (error instanceof Error) {
      loadingError.value = error
      throw error // Re-throw to ensure error is propagated
    }
  }
}

// Initialization
onMounted(() => {
  try {
    // Just set initialized to true since columns are already provided via props
    isInitialized.value = true
  } catch (err) {
    if (err instanceof Error) {
      loadingError.value = err
    }
  }
})
</script>

<style scoped>
.bg-background {
  background-color: white;
}
</style>
