<template>
  <div class="h-full flex flex-col">
    <!-- Search and Filter Controls - Only for Available Parameters -->
    <template v-if="props.mode === 'available'">
      <div class="px-2 pt-2">
        <SearchBar
          v-model="localSearchTerm"
          @update:model-value="$emit('update:searchTerm', $event)"
        />
        <FilterControls
          v-model:is-grouped="localIsGrouped"
          v-model:sort-by="localSortBy"
          :sort-options="sortOptions"
          @update:is-grouped="$emit('update:isGrouped', $event)"
          @update:sort-by="$emit('update:sortBy', $event)"
        />
      </div>
    </template>

    <!-- Main content area with proper overflow -->
    <div
      class="flex-1 overflow-y-auto p-2 space-y-1"
      @dragover.prevent
      @dragenter.prevent
      @drop="(e) => $emit('drop', e)"
    >
      <!-- When Grouped and Available -->
      <template v-if="shouldShowGroupedView">
        <div v-for="group in groupedColumns" :key="group.category" class="space-y-1">
          <div class="px-2 py-1 bg-gray-50 text-sm font-medium rounded">
            {{ group.category }}
          </div>
          <div
            class="space-y-1 pl-2"
            @dragover.prevent
            @dragenter.prevent="handleDragEnter($event, -1, group.category)"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop($event, -1, group.category)"
          >
            <ColumnListItem
              v-for="(column, index) in group.columns"
              :key="column.field"
              :column="column"
              :mode="mode"
              :is-dragging-over="
                isDraggingOver &&
                dragOverIndex === getAbsoluteIndex(group.category, index)
              "
              draggable="true"
              @dragstart="
                (event) =>
                  handleDragStart(
                    event,
                    column,
                    getAbsoluteIndex(group.category, index)
                  )
              "
              @dragenter="
                (event) =>
                  handleDragEnter(event, getAbsoluteIndex(group.category, index))
              "
              @dragleave="handleDragLeave"
              @dragover.prevent
              @drop="
                (event) => handleDrop(event, getAbsoluteIndex(group.category, index))
              "
              @remove="handleRemove"
              @visibility-change="handleVisibilityChange"
            />
          </div>
        </div>
      </template>

      <!-- When not grouped or Active -->
      <template v-else>
        <div class="space-y-1">
          <ColumnListItem
            v-for="(column, index) in mode === 'available' ? filteredColumns : items"
            :key="column.field"
            :column="column"
            :mode="mode"
            :is-dragging-over="isDraggingOver && dragOverIndex === index"
            draggable="true"
            @dragstart="(event) => handleDragStart(event, column, index)"
            @dragenter="(event) => handleDragEnter(event, index)"
            @dragleave="handleDragLeave"
            @dragover.prevent
            @drop="(event) => handleDrop(event, index)"
            @remove="handleRemove"
            @add="handleAdd"
            @visibility-change="handleVisibilityChange"
          />
        </div>
      </template>

      <!-- No Results Message -->
      <div v-if="showNoResults" class="p-4 text-center text-gray-500">
        {{ noResultsMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../../../composables/types'
import { useColumnManagement } from '../../../composables/useColumnManagement'
import ColumnListItem from './ColumnListItem.vue'
import SearchBar from './SearchBar.vue'
import FilterControls from './FilterControls.vue'

interface Props {
  items: (ColumnDef | ParameterDefinition)[]
  mode: 'active' | 'available'
  searchTerm?: string
  isGrouped?: boolean
  sortBy?: 'name' | 'category' | 'type' | 'fixed'
}

const props = withDefaults(defineProps<Props>(), {
  searchTerm: '',
  isGrouped: true,
  sortBy: 'category'
})

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:isGrouped': [value: boolean]
  'update:sortBy': [value: string]
  remove: [item: ColumnDef | ParameterDefinition]
  add: [item: ParameterDefinition]
  'visibility-change': [item: ColumnDef | ParameterDefinition, visible: boolean]
  reorder: [fromIndex: number, toIndex: number]
  'drag-start': [event: DragEvent, item: ColumnDef | ParameterDefinition]
  'drag-enter': [index: number]
  drop: [event: DragEvent, index: number]
}>()

// Use column management composable
const { columns, filteredColumns, groupedColumns, updateColumns } = useColumnManagement(
  {
    initialColumns: props.items,
    searchTerm: computed(() => props.searchTerm),
    isGrouped: computed(() => props.isGrouped),
    sortBy: computed(() => props.sortBy)
  }
)

// Local state
const draggedItem = ref<{
  item: ColumnDef | ParameterDefinition
  sourceMode: 'active' | 'available'
  index: number
  category?: string
} | null>(null)
const dragOverIndex = ref(-1)
const dragOverCategory = ref<string | null>(null)
const isDraggingOver = ref(false)

// Computed properties
const localSearchTerm = computed({
  get: () => props.searchTerm,
  set: (value) => emit('update:searchTerm', value)
})

const localIsGrouped = computed({
  get: () => props.isGrouped,
  set: (value) => emit('update:isGrouped', value)
})

const localSortBy = computed({
  get: () => props.sortBy,
  set: (value) => emit('update:sortBy', value)
})

// Helper methods
const getAbsoluteIndex = (category: string, index: number): number => {
  let absoluteIndex = 0
  for (const group of groupedColumns.value) {
    if (group.category === category) {
      return absoluteIndex + index
    }
    absoluteIndex += group.columns.length
  }
  return index
}

// Drag and drop handlers
const handleDragStart = (
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) => {
  if (!event.dataTransfer) return

  draggedItem.value = {
    item,
    sourceMode: props.mode,
    index,
    category: 'category' in item ? item.category : undefined
  }

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify(draggedItem.value))
  emit('drag-start', event, item)
}

const handleDragEnter = (event: DragEvent, index: number, category?: string) => {
  event.preventDefault()
  dragOverIndex.value = index
  dragOverCategory.value = category || null
  isDraggingOver.value = true
  emit('drag-enter', index)
}

const handleDragLeave = (event: DragEvent) => {
  event.preventDefault()
  if (
    event.target instanceof HTMLElement &&
    !event.currentTarget?.contains(event.relatedTarget as Node)
  ) {
    isDraggingOver.value = false
    dragOverIndex.value = -1
    dragOverCategory.value = null
  }
}

const handleDrop = (event: DragEvent, index: number, category?: string) => {
  event.preventDefault()
  const jsonData = event.dataTransfer?.getData('application/json')
  if (!jsonData || !draggedItem.value) return

  const { sourceMode, index: sourceIndex } = draggedItem.value

  if (sourceMode === props.mode) {
    // Reordering within the same list
    if (sourceIndex !== index) {
      emit('reorder', sourceIndex, index)
    }
  } else if (sourceMode === 'available' && props.mode === 'active') {
    // Adding from available to active
    emit('add', draggedItem.value.item as ParameterDefinition)
  } else if (sourceMode === 'active' && props.mode === 'available') {
    // Removing from active
    emit('remove', draggedItem.value.item as ColumnDef)
  }

  resetDragState()
}

const handleListDrop = (event: DragEvent) => {
  event.preventDefault()
  if (!draggedItem.value) return

  const { sourceMode } = draggedItem.value

  if (sourceMode === 'available' && props.mode === 'active') {
    emit('add', draggedItem.value.item as ParameterDefinition)
  } else if (sourceMode === 'active' && props.mode === 'available') {
    emit('remove', draggedItem.value.item)
  }

  resetDragState()
}

const resetDragState = () => {
  draggedItem.value = null
  dragOverIndex.value = -1
  dragOverCategory.value = null
  isDraggingOver.value = false
}

// Other handlers
const handleRemove = (item: ColumnDef | ParameterDefinition) => {
  emit('remove', item)
}

const handleAdd = (item: ParameterDefinition) => {
  emit('add', item)
}

const handleVisibilityChange = (
  item: ColumnDef | ParameterDefinition,
  visible: boolean
) => {
  emit('visibility-change', item, visible)
}

// Sort options
const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'fixed', label: 'Fixed First' }
] as const

const shouldShowGroupedView = computed(
  () => props.isGrouped && props.mode === 'available' && groupedColumns.value.length > 0
)

const showNoResults = computed(
  () => (props.mode === 'available' ? filteredColumns.value : props.items).length === 0
)

const noResultsMessage = computed(() => {
  if (localSearchTerm.value) {
    return 'No columns match your search'
  }
  return props.mode === 'active' ? 'No active columns' : 'No available columns'
})
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
