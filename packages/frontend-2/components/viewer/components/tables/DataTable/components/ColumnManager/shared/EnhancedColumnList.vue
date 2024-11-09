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
      role="listbox"
      tabindex="0"
      aria-label="Column list"
      @dragover.prevent
      @dragenter.prevent="handleListDragEnter"
      @dragleave.prevent="handleListDragLeave"
      @drop.prevent="handleListDrop"
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
              @visibility-change="handleVisibilityChange"
              @drag-start="
                (event) =>
                  handleItemDragStart(
                    event,
                    item,
                    getAbsoluteIndex(categoryIndex, itemIndex)
                  )
              "
              @drop="
                (event) =>
                  handleItemDrop(event, getAbsoluteIndex(categoryIndex, itemIndex))
              "
              @drag-end="handleItemDragEnd"
              @drag-enter="
                (event) =>
                  handleItemDragEnter(event, getAbsoluteIndex(categoryIndex, itemIndex))
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
            @visibility-change="handleVisibilityChange"
            @drag-start="(event) => handleItemDragStart(event, item, index)"
            @drop="(event) => handleItemDrop(event, index)"
            @drag-end="handleItemDragEnd"
            @drag-enter="(event) => handleItemDragEnter(event, index)"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, onUnmounted } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../../../composables/types'
import ColumnListItem from './ColumnListItem.vue'
import SearchBar from './SearchBar.vue'
import FilterControls from './FilterControls.vue'

interface Props {
  items: (ColumnDef | ParameterDefinition)[]
  mode: 'active' | 'available'
  searchTerm?: string
  isGrouped?: boolean
  sortBy?: 'name' | 'category' | 'type' | 'fixed'
  debug?: boolean
  showFilterOptions?: boolean
  dropPosition?: 'above' | 'below' | null
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  searchTerm: '',
  isGrouped: true,
  sortBy: 'category',
  debug: false,
  showFilterOptions: false,
  dropPosition: null
})

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
  reorder: [fromIndex: number, toIndex: number]
}>()

// Drag state management
const dropState = reactive({
  dragging: null as string | null,
  targetIndex: null as number | null,
  dropPosition: props.dropPosition
})

// Computed properties
const safeItems = computed(() => {
  return props.items.filter(
    (item): item is ColumnDef | ParameterDefinition =>
      item && typeof item === 'object' && 'field' in item
  )
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

function handleVisibilityChange(column: ColumnDef, visible: boolean) {
  emit('visibility-change', column, visible)
}

function handleItemDragStart(
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) {
  if (!event.dataTransfer) return

  dropState.dragging = item.field

  const dragData = {
    field: item.field,
    sourceMode: props.mode,
    item,
    index
  }

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify(dragData))

  emit('drag-start', event, item, index)
}

function handleItemDragEnter(event: DragEvent, index: number) {
  if (!event.currentTarget) return

  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropState.targetIndex = index
  dropState.dropPosition = mouseY < threshold ? 'above' : 'below'

  emit('drag-enter', event, index)
}

function handleItemDrop(event: DragEvent, targetIndex?: number) {
  event.preventDefault()

  try {
    const rawData = event.dataTransfer?.getData('application/json')
    if (!rawData) return

    const data = JSON.parse(rawData) as {
      field: string
      sourceMode: 'active' | 'available'
      item: ColumnDef | ParameterDefinition
      index: number
    }

    if (data.field && data.sourceMode) {
      if (
        data.sourceMode === props.mode &&
        typeof data.index === 'number' &&
        typeof targetIndex === 'number'
      ) {
        const sourceIndex = data.index
        const finalTargetIndex =
          dropState.dropPosition === 'below' ? targetIndex + 1 : targetIndex

        if (sourceIndex !== finalTargetIndex) {
          emit('reorder', sourceIndex, finalTargetIndex)
        }
      } else {
        if (props.mode === 'active' && 'field' in data.item) {
          emit('add', data.item as ParameterDefinition)
        } else {
          emit('remove', data.item)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Drop handling error:', error.message)
    }
  } finally {
    resetDropState()
  }
}

function handleItemDragEnd(event: DragEvent) {
  emit('drag-end', event)
  resetDropState()
}

function handleListDragEnter(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleListDrop(event: DragEvent) {
  emit('drop', event)
  resetDropState()
}

function handleListDragLeave(event: DragEvent) {
  const target = event.target as HTMLElement
  const relatedTarget = event.relatedTarget as HTMLElement | null

  if (target && (!relatedTarget || !target.contains(relatedTarget))) {
    resetDropState()
  }
}

function resetDropState() {
  dropState.dragging = null
  dropState.targetIndex = null
  dropState.dropPosition = null
}

// Helper functions
function getAbsoluteIndex(categoryIndex: number, itemIndex: number): number {
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
  resetDropState()
})

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
