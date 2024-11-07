<template>
  <div class="enhanced-column-list">
    <!-- Search and Filter Controls -->
    <div v-if="mode === 'available' && !showFilterOptions" class="px-2 pt-1">
      <div class="flex gap-1">
        <SearchBar
          v-model="localSearchTerm"
          @update:model-value="$emit('update:searchTerm', $event)"
        />
        <FilterControls
          v-model:is-grouped="localIsGrouped"
          v-model:sort-by="localSortBy"
          class="ml-auto"
          :sort-options="sortOptions"
          @update:is-grouped="$emit('update:isGrouped', $event)"
          @update:sort-by="$emit('update:sortBy', $event)"
        />
      </div>
    </div>

    <!-- List info -->
    <div
      v-if="mode === 'available' && !showFilterOptions"
      class="px-2 py-0 text-xs text-gray-500 border-b"
    >
      Found: {{ safeItems.length }} | Filtered: {{ filteredItems.length }} | Groups:
      {{ sortedCategories.length }}
    </div>

    <!-- Main content area -->
    <div
      class="flex-1 overflow-y-auto p-1 relative"
      @dragover.prevent
      @dragenter.prevent="handleListDragEnter"
      @dragleave.prevent="handleListDragLeave"
      @drop.prevent="$emit('drop', $event)"
    >
      <!-- Empty state -->
      <div v-if="!safeItems.length" class="p-4 text-center text-gray-500">
        {{ mode === 'available' ? 'No available parameters' : 'No active columns' }}
      </div>

      <!-- Grouped View -->
      <template v-else-if="shouldShowGroupedView">
        <div
          v-for="(category, categoryIndex) in sortedCategories"
          :key="category"
          class="mb-2"
        >
          <div class="group-header mb-1 p-1 bg-gray-50 text-sm font-medium rounded">
            {{ category }}
            <span class="text-xs text-gray-500">
              ({{ groupedItems[category]?.length || 0 }})
            </span>
          </div>

          <div class="space-y-1">
            <ColumnListItem
              v-for="(item, itemIndex) in groupedItems[category]"
              :key="item.field"
              :column="item"
              :mode="mode"
              :index="getAbsoluteIndex(categoryIndex, itemIndex)"
              :is-dragging="isDragging(item)"
              :is-drop-target="isDropTarget(categoryIndex, itemIndex)"
              :drop-position="dropState.dropPosition"
              @add="$emit('add', $event)"
              @remove="$emit('remove', $event)"
              @visibility-change="$emit('visibility-change', $event)"
              @drag-start="(e, item) => handleDragStart(e, item, index)"
              @drop="(e) => handleDrop(e, index)"
              @drag-end="$emit('drag-end', $event)"
              @drag-enter="
                (e, index) =>
                  handleDragEnter(e, getAbsoluteIndex(categoryIndex, itemIndex))
              "
            />
          </div>
        </div>
      </template>

      <!-- Flat View -->
      <template v-else>
        <div class="space-y-1">
          <ColumnListItem
            v-for="(item, index) in displayItems"
            :key="item.field"
            :column="item"
            :mode="mode"
            :index="index"
            :is-dragging="isDragging(item)"
            :is-drop-target="isDropTarget(null, index)"
            :drop-position="dropState.dropPosition"
            @add="$emit('add', $event)"
            @remove="$emit('remove', $event)"
            @visibility-change="$emit('visibility-change', $event)"
            @drag-start="(e, item) => handleDragStart(e, item, index)"
            @drop="(e) => handleDrop(e, index)"
            @drag-end="$emit('drag-end', $event)"
            @drag-enter="(e) => handleDragEnter(e, index)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onUnmounted, watch } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../../../composables/types'
import ColumnListItem from './ColumnListItem.vue'
import SearchBar from './SearchBar.vue'
import FilterControls from './FilterControls.vue'

const props = withDefaults(
  defineProps<{
    items: (ColumnDef | ParameterDefinition)[]
    mode: 'active' | 'available'
    searchTerm?: string
    isGrouped?: boolean
    sortBy?: 'name' | 'category' | 'type' | 'fixed'
    debug?: boolean
    showFilterOptions?: boolean
  }>(),
  {
    items: () => [],
    searchTerm: '',
    isGrouped: true,
    sortBy: 'category',
    debug: false,
    showFilterOptions: false
  }
)

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:isGrouped': [value: boolean]
  'update:sortBy': [value: string]
  add: [item: ParameterDefinition]
  remove: [item: ColumnDef | ParameterDefinition]
  'visibility-change': [item: ColumnDef | ParameterDefinition, visible: boolean]
  'drag-start': [event: DragEvent, item: ColumnDef | ParameterDefinition, index: number]
  'drag-end': [event: DragEvent]
  'drag-enter': [event: DragEvent, index: number]
  drop: [event: DragEvent, index?: number]
}>()

// Update drag state management
const dropState = reactive({
  dragging: null as string | null,
  targetIndex: null as number | null,
  dropPosition: null as 'above' | 'below' | null
})

// Computed properties
const safeItems = computed(() => {
  if (!Array.isArray(props.items)) {
    console.warn('Items prop is not an array:', props.items)
    return []
  }

  const validItems = props.items.filter(
    (item) => item && typeof item === 'object' && 'field' in item
  )

  if (validItems.length !== props.items.length) {
    console.warn('Some items were invalid:', {
      total: props.items.length,
      valid: validItems.length
    })
  }

  return validItems
})

const filteredItems = computed(() => {
  const items = safeItems.value
  if (!props.searchTerm) return items

  const search = props.searchTerm.toLowerCase()
  return items.filter(
    (item) =>
      item.field.toLowerCase().includes(search) ||
      (item.header || '').toLowerCase().includes(search) ||
      (item.category || '').toLowerCase().includes(search)
  )
})

const groupedItems = computed(() => {
  if (!props.isGrouped) return {}

  return filteredItems.value.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, (ColumnDef | ParameterDefinition)[]>)
})

const sortedCategories = computed(() => Object.keys(groupedItems.value).sort())

const displayItems = computed(() =>
  props.mode === 'available' ? filteredItems.value : safeItems.value
)

const shouldShowGroupedView = computed(
  () =>
    !!(
      props.isGrouped &&
      props.mode === 'available' &&
      sortedCategories.value.length > 0
    )
)

// Drag and drop helpers
function isDragging(item: ColumnDef | ParameterDefinition): boolean {
  return item && dropState.dragging === item.field
}

function isDropTarget(categoryIndex: number | null, itemIndex: number): boolean {
  return (
    dropState.targetIndex ===
    (categoryIndex !== null ? getAbsoluteIndex(categoryIndex, itemIndex) : itemIndex)
  )
}

function handleDragStart(
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) {
  if (!event.dataTransfer) return

  dropState.dragging = item.field

  event.dataTransfer.setData(
    'application/json',
    JSON.stringify({
      field: item.field,
      sourceMode: props.mode,
      item,
      index
    })
  )

  emit('drag-start', event, item, index)
}

function handleDrop(event: DragEvent, index?: number) {
  event.preventDefault()

  try {
    const data = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    emit('drop', event, index)
  } catch (error) {
    console.error('Drop handling error:', error)
  } finally {
    clearDropState()
  }
}

function handleDragEnd(event: DragEvent) {
  // Handle drag end outside valid targets
  if (!event.dataTransfer?.dropEffect || event.dataTransfer.dropEffect === 'none') {
    if (props.mode === 'active' && dropState.dragging) {
      const draggedItem = props.items.find((item) => item.field === dropState.dragging)
      if (draggedItem) {
        emit('remove', draggedItem)
      }
    }
  }

  clearDropState()
  emit('drag-end', event)
}

function handleDragEnter(event: DragEvent, index: number) {
  if (!event.currentTarget) return

  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropState.targetIndex = index
  dropState.dropPosition = mouseY < threshold ? 'above' : 'below'
}

function handleListDragLeave(event: DragEvent) {
  if (
    event.target instanceof HTMLElement &&
    !event.currentTarget?.contains(event.relatedTarget as Node)
  ) {
    dropState.targetIndex = null
    dropState.dropPosition = null
  }
}

function clearDropState() {
  dropState.dragging = null
  dropState.targetIndex = null
  dropState.dropPosition = null
}

const showDropIndicator = computed(
  () =>
    dropState.dragging !== null &&
    dropState.targetIndex !== null &&
    dropState.dropPosition !== null
)

const dropIndicatorStyle = computed(() => {
  if (!showDropIndicator.value) return {}

  const itemHeight = 40
  const top = (dropState.targetIndex || 0) * itemHeight

  return {
    top: `${dropState.dropPosition === 'above' ? top : top + itemHeight}px`,
    transform: 'translateY(-50%)'
  }
})

function handleListDragEnter(event: DragEvent) {
  if (event.target instanceof HTMLElement) {
    event.preventDefault()
    event.dataTransfer!.dropEffect = 'move'
  }
}

// Helper functions
function getAbsoluteIndex(categoryIndex: number, itemIndex: number): number {
  try {
    let absoluteIndex = 0
    const categories = sortedCategories.value
    const groups = groupedItems.value

    for (let i = 0; i < categoryIndex; i++) {
      const category = categories[i]
      if (category && groups[category]) {
        absoluteIndex += groups[category].length
      }
    }
    return absoluteIndex + itemIndex
  } catch (error) {
    console.error('Error in getAbsoluteIndex:', error)
    return 0
  }
}

// UI State computed
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

onUnmounted(() => {
  clearDropState()
})

// Debug watchers
if (props.debug) {
  watch(
    () => props.items,
    (newItems) => {
      console.log('EnhancedColumnList items updated:', {
        mode: props.mode,
        total: newItems?.length,
        safe: safeItems.value.length,
        timestamp: Date.now()
      })
    },
    { immediate: true }
  )
}

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'fixed', label: 'Fixed First' }
] as const
</script>

<style scoped>
.enhanced-column-list {
  @apply flex flex-col h-full;
}

.group-header {
  @apply sticky top-[-6px] z-10;
}
</style>
