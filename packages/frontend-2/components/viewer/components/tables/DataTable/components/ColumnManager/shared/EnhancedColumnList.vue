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

    <!-- Main content area -->
    <div
      class="flex-1 overflow-y-auto p-1 relative"
      @dragover.prevent
      @dragenter.prevent="handleListDragEnter"
      @dragleave.prevent="handleListDragLeave"
      @drop.prevent="handleListDrop"
    >
      <!-- Grouped View -->
      <template v-if="shouldShowGroupedView">
        <div
          v-for="(category, categoryIndex) in sortedCategories"
          :key="category"
          class="mb-1"
        >
          <div
            class="group-header mb-1 p-1 bg-gray-50 text-sm font-medium rounded-t flex justify-between items-center"
          >
            <span>{{ category }}</span>
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
              :is-dragging="isItemBeingDragged(item)"
              :is-drop-target="
                dragOverIndex === getAbsoluteIndex(categoryIndex, itemIndex)
              "
              :drop-position="dropPosition"
              @add="handleAdd"
              @remove="handleRemove"
              @visibility-change="handleVisibilityChange"
              @drag-start="handleItemDragStart"
              @drag-end="handleItemDragEnd"
              @drag-enter="handleItemDragEnter"
              @drop="handleItemDrop"
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
            :is-dragging="isItemBeingDragged(item)"
            :is-drop-target="dragOverIndex === index"
            :drop-position="dropPosition"
            @add="handleAdd"
            @remove="handleRemove"
            @visibility-change="handleVisibilityChange"
            @drag-start="handleItemDragStart"
            @drag-end="handleItemDragEnd"
            @drag-enter="handleItemDragEnter"
            @drop="handleItemDrop"
          />
        </div>
      </template>

      <!-- Drop indicator -->
      <div
        v-if="showDropIndicator"
        class="absolute inset-x-0 h-0.5 bg-primary transition-all duration-200"
        :style="dropIndicatorStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../../../composables/types'
import { useColumnDragDrop } from '../../../composables/columns/useColumnDragDrop'
import ColumnListItem from './ColumnListItem.vue'
import SearchBar from './SearchBar.vue'
import FilterControls from './FilterControls.vue'

interface Props {
  items: (ColumnDef | ParameterDefinition)[]
  mode: 'active' | 'available'
  searchTerm?: string
  isGrouped?: boolean
  sortBy?: 'name' | 'category' | 'type' | 'fixed'
  showFilterOptions?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  mode: 'active',
  searchTerm: '',
  isGrouped: true,
  sortBy: 'category',
  showFilterOptions: false
})

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:isGrouped': [value: boolean]
  'update:sortBy': [value: string]
  'update:columns': [columns: (ColumnDef | ParameterDefinition)[]]
  add: [item: ParameterDefinition]
  remove: [item: ColumnDef | ParameterDefinition]
  'visibility-change': [item: ColumnDef | ParameterDefinition, visible: boolean]
  reorder: [fromIndex: number, toIndex: number]
}>()

// Drag state management
const draggedItemField = ref<string | null>(null)
const dragOverIndex = ref<number | null>(null)
const dropPosition = ref<'above' | 'below' | null>(null)

// Computed props
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

// Items management
const filteredItems = computed(() => {
  let items = props.items || []

  if (props.searchTerm) {
    const search = props.searchTerm.toLowerCase()
    items = items.filter(
      (item) =>
        item.header?.toLowerCase().includes(search) ||
        item.field?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search)
    )
  }

  return items
})

const groupedItems = computed(() => {
  if (!props.isGrouped) return {}

  return filteredItems.value.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, (ColumnDef | ParameterDefinition)[]>)
})

const sortedCategories = computed(() => Object.keys(groupedItems.value).sort())
const displayItems = computed(() =>
  props.mode === 'available' ? filteredItems.value : props.items
)
const shouldShowGroupedView = computed(
  () =>
    props.isGrouped &&
    props.mode === 'available' &&
    Object.keys(groupedItems.value).length > 0
)

// Drag and drop helpers
function isItemBeingDragged(item: ColumnDef | ParameterDefinition): boolean {
  return draggedItemField.value === item.field
}

const showDropIndicator = computed(
  () =>
    draggedItemField.value !== null &&
    dragOverIndex.value !== null &&
    dropPosition.value !== null
)

const dropIndicatorStyle = computed(() => {
  if (!showDropIndicator.value) return {}

  const itemHeight = 40
  const top = (dragOverIndex.value || 0) * itemHeight

  return {
    top: `${dropPosition.value === 'above' ? top : top + itemHeight}px`,
    transform: 'translateY(-50%)'
  }
})

// Event handlers
function handleItemDragStart(
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) {
  console.log('Drag start:', { mode: props.mode, item, index })
  draggedItemField.value = item.field

  if (event.dataTransfer) {
    const transferData = {
      field: item.field,
      sourceMode: props.mode,
      sourceIndex: index,
      item
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/json', JSON.stringify(transferData))
  }
}

function handleItemDragEnd() {
  clearDragState()
}

function handleItemDragEnter(event: DragEvent, index: number) {
  if (!draggedItemField.value || !event.currentTarget) return

  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dragOverIndex.value = index
  dropPosition.value = mouseY < threshold ? 'above' : 'below'
}

// cccccccc

function handleItemDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()

  try {
    const data = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    const { sourceMode, sourceIndex, item } = data

    console.log('Drop handling:', {
      sourceMode,
      currentMode: props.mode,
      item,
      targetIndex
    })

    // Cross-list operation
    if (sourceMode !== props.mode) {
      if (props.mode === 'active' && item) {
        // Adding from available to active
        const newColumn: ColumnDef = {
          ...item,
          visible: true,
          removable: true,
          order: props.items.length
        }

        // Update columns immediately
        const newColumns = [...props.items, newColumn]
        console.log('Adding column:', { newColumn, newColumns })

        emit('add', item)
        emit('update:columns', newColumns)
      } else if (props.mode === 'available' && draggedItemField.value) {
        // Find the item being removed
        const itemToRemove = props.items.find((i) => i.field === draggedItemField.value)
        if (itemToRemove) {
          // Remove from columns
          const newColumns = props.items.filter(
            (i) => i.field !== draggedItemField.value
          )
          console.log('Removing column:', { itemToRemove, newColumns })

          emit('remove', itemToRemove)
          emit('update:columns', newColumns)
        }
      }
    } else {
      // Same list reordering
      const actualFromIndex = sourceIndex
      let actualToIndex = targetIndex

      if (dropPosition.value === 'below') {
        actualToIndex += 1
      }

      // Only emit if indices are different
      if (actualFromIndex !== actualToIndex) {
        console.log('Reordering:', { from: actualFromIndex, to: actualToIndex })

        // Update columns immediately
        const newColumns = [...props.items]
        const [movedItem] = newColumns.splice(actualFromIndex, 1)
        newColumns.splice(actualToIndex, 0, movedItem)

        // Update order properties
        const updatedColumns = newColumns.map((col, index) => ({
          ...col,
          order: index
        }))

        emit('reorder', actualFromIndex, actualToIndex)
        emit('update:columns', updatedColumns)
      }
    }
  } catch (error) {
    console.error('Drop handling error:', error)
  } finally {
    clearDragState()
  }
}

// Update the action handlers to include column updates
function handleAdd(item: ParameterDefinition) {
  console.log('Handle add:', item)

  const newColumn: ColumnDef = {
    ...item,
    visible: true,
    removable: true,
    order: props.items.length
  }

  const newColumns = [...props.items, newColumn]
  emit('add', item)
  emit('update:columns', newColumns)
}

function handleRemove(item: ColumnDef | ParameterDefinition) {
  console.log('Handle remove:', item)

  const newColumns = props.items.filter((i) => i.field !== item.field)
  emit('remove', item)
  emit('update:columns', newColumns)
}

// Add debug watches
watch(
  () => props.items,
  (newItems, oldItems) => {
    console.log('Items changed:', {
      mode: props.mode,
      oldCount: oldItems?.length,
      newCount: newItems?.length,
      items: newItems
    })
  },
  { deep: true }
)

watch(
  () => ({ draggedField: draggedItemField.value, dragOverIndex: dragOverIndex.value }),
  (newVal) => {
    console.log('Drag state changed:', newVal)
  },
  { deep: true }
)

// cccccc

// List-level handlers
function handleListDragEnter() {
  // Only needed for list-level effects
}

function handleListDragLeave(event: DragEvent) {
  if (
    event.target instanceof HTMLElement &&
    !event.currentTarget?.contains(event.relatedTarget as Node)
  ) {
    clearDragState()
  }
}

function handleListDrop() {
  clearDragState()
}

// Action handlers

function handleVisibilityChange(
  item: ColumnDef | ParameterDefinition,
  visible: boolean
) {
  emit('visibility-change', item, visible)
}

// Helper functions
function getAbsoluteIndex(categoryIndex: number, itemIndex: number): number {
  let absoluteIndex = 0
  for (let i = 0; i < categoryIndex; i++) {
    const category = sortedCategories.value[i]
    absoluteIndex += groupedItems.value[category]?.length || 0
  }
  return absoluteIndex + itemIndex
}

function clearDragState() {
  draggedItemField.value = null
  dragOverIndex.value = null
  dropPosition.value = null
}

// Debug logging
console.log('EnhancedColumnList initialized:', {
  mode: props.mode,
  itemsCount: props.items.length,
  filteredCount: filteredItems.value?.length,
  groupedCount: Object.keys(groupedItems.value || {}).length
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

.drop-indicator {
  @apply absolute inset-x-0 h-0.5 bg-primary transition-all duration-200;
}
</style>
