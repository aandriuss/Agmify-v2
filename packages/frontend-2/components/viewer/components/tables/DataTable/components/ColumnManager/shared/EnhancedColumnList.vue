<template>
  <div class="enhanced-column-list">
    <!-- List info -->
    <div v-if="mode === 'available'" class="px-2 py-1 text-xs text-gray-500">
      Found: {{ items.length }} | Filtered: {{ filteredItems.length }} | Groups:
      {{ Object.keys(groupedItems).length }}
    </div>

    <!-- Search and Filter Controls -->
    <div v-if="mode === 'available'" class="px-2 pt-1">
      <div class="flex gap-2">
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
      class="flex-1 overflow-y-auto p-2 relative"
      @dragover.prevent
      @dragenter.prevent="handleListDragEnter"
      @dragleave.prevent="handleListDragLeave"
      @drop.prevent="handleListDrop"
    >
      <!-- Group Items -->
      <template v-if="shouldShowGroupedView">
        <div
          v-for="(category, categoryIndex) in sortedCategories"
          :key="category"
          class="mb-2"
        >
          <div
            class="group-header mb-1 p-2 bg-gray-50 text-sm font-medium rounded-t flex justify-between items-center"
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
              :is-dragging="
                draggedItemIndex === getAbsoluteIndex(categoryIndex, itemIndex)
              "
              :is-drop-target="
                dragOverIndex === getAbsoluteIndex(categoryIndex, itemIndex)
              "
              :drop-position="currentDropPosition"
              @add="handleAdd"
              @remove="handleRemove"
              @visibility-change="handleVisibilityChange"
              @drag-start="handleItemDragStart"
              @drag-end="handleItemDragEnd"
              @drag-enter="handleItemDragEnter"
              @drag-leave="handleItemDragLeave"
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
            :is-dragging="draggedItemIndex === index"
            :is-drop-target="dragOverIndex === index"
            :drop-position="currentDropPosition"
            @add="handleAdd"
            @remove="handleRemove"
            @visibility-change="handleVisibilityChange"
            @drag-start="handleItemDragStart"
            @drag-end="handleItemDragEnd"
            @drag-enter="handleItemDragEnter"
            @drag-leave="handleItemDragLeave"
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
import ColumnListItem from './ColumnListItem.vue'
import SearchBar from './SearchBar.vue'
import FilterControls from './FilterControls.vue'
import { useColumnDragDrop } from '../../../composables/columns/useColumnDragDrop'

// Props and emits definitions first
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
  'drag-start': [event: DragEvent, item: ColumnDef | ParameterDefinition, index: number]
  'drag-end': [event: DragEvent]
  'drag-enter': [event: DragEvent, index: number, position: 'above' | 'below']
  'drag-leave': [event: DragEvent]
  drop: [event: DragEvent, index: number, position: 'above' | 'below']
}>()

// Initialize drag and drop state first
const draggedItemIndex = ref<number | null>(null)

const {
  dragState,
  dragOverIndex,
  dropPosition: currentDropPosition,
  isDragging,
  startDrag,
  updateDragOver,
  clearDragState,
  handleDrop: processDrop
} = useColumnDragDrop()

// Now we can safely add the watch after dragState is initialized
watch(
  () => dragState.value,
  (newState) => {
    if (newState) {
      console.log('Drag state changed:', {
        state: newState,
        dragOverIndex: dragOverIndex.value,
        dropPosition: currentDropPosition.value
      })
    }
  },
  { deep: true }
)

// Computed props for two-way binding
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

// Rest of your component code...

// Enhanced drop indicator
const showDropIndicator = computed(
  () => isDragging.value && dragOverIndex.value !== null
)

const dropIndicatorStyle = computed(() => {
  if (!showDropIndicator.value) return {}

  const itemHeight = 40 // Approximate height of each item
  const top = (dragOverIndex.value || 0) * itemHeight

  return {
    top: `${currentDropPosition.value === 'above' ? top : top + itemHeight}px`,
    transform: 'translateY(-50%)'
  }
})

// Event handlers
const handleItemDragStart = (event: DragEvent, item: any, index: number) => {
  try {
    console.log('Drag start:', { mode: props.mode, index, field: item.field })
    draggedItemIndex.value = index
    startDrag(item, props.mode, index)
    emit('drag-start', event, item, index)
  } catch (error) {
    console.error('Error in drag start:', error)
  }
}

const handleItemDrop = async (event: DragEvent, targetIndex: number) => {
  try {
    if (!dragState.value || !currentDropPosition.value) {
      console.warn('Missing drag state or drop position')
      return
    }

    const { sourceIndex, sourceList } = dragState.value

    console.log('Drop handling:', {
      sourceIndex,
      targetIndex,
      dropPosition: currentDropPosition.value,
      mode: props.mode,
      sourceList
    })

    // Handle cross-list drops
    if (sourceList !== props.mode) {
      if (props.mode === 'active') {
        emit('add', dragState.value.item as ParameterDefinition)
      } else {
        emit('remove', dragState.value.item as ColumnDef)
      }
      return
    }

    // Handle reordering within the same list
    if (sourceIndex !== targetIndex) {
      // Calculate final target index based on drop position and drag direction
      let finalTargetIndex = targetIndex

      // Adjust for drop position
      if (currentDropPosition.value === 'below') {
        finalTargetIndex += 1
      }

      // Adjust for dragging up/down
      if (sourceIndex < finalTargetIndex) {
        finalTargetIndex -= 1
      }

      console.log('Reordering:', {
        from: sourceIndex,
        to: finalTargetIndex,
        items: props.items.map((item) => ({
          field: item.field,
          index: item.order
        }))
      })

      // Emit reorder event
      emit('reorder', sourceIndex, finalTargetIndex)
    }
  } catch (error) {
    console.error('Error in drop handler:', error)
  } finally {
    draggedItemIndex.value = null
    clearDragState()
  }
}

const handleItemDragEnd = () => {
  draggedItemIndex.value = null
  clearDragState()
}

// Fix the drag enter handler
const handleItemDragEnter = (event: DragEvent, index: number) => {
  if (!dragState.value || !event.currentTarget) return

  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY

  // Calculate relative mouse position within the item
  const relativeY = mouseY - rect.top
  const threshold = rect.height / 2

  // Update drop position based on mouse location
  const position = relativeY < threshold ? 'above' : 'below'

  console.log('Drag enter:', {
    index,
    position,
    relativeY,
    threshold,
    element: !!element
  })

  try {
    updateDragOver(index, props.mode, position)
  } catch (error) {
    console.error('Error updating drag over:', error)
  }
}

// Add drag state debugging
watch(
  () => dragState.value,
  (newState) => {
    console.log('Drag state changed:', {
      state: newState,
      dragOverIndex: dragOverIndex.value,
      dropPosition: currentDropPosition.value
    })
  },
  { deep: true }
)

// >>>>>>>>>>>>

// Filtered items
const filteredItems = computed(() => {
  let result = [...props.items]

  if (localSearchTerm.value) {
    const search = localSearchTerm.value.toLowerCase()
    result = result.filter((item) => {
      return (
        item.header?.toLowerCase().includes(search) ||
        item.field?.toLowerCase().includes(search) ||
        item.category?.toLowerCase().includes(search)
      )
    })
  }

  return result
})

// Grouped items
const groupedItems = computed(() => {
  return filteredItems.value.reduce((acc, item) => {
    const category = item.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, (ColumnDef | ParameterDefinition)[]>)
})

const sortedCategories = computed(() => {
  return Object.keys(groupedItems.value).sort()
})

const displayItems = computed(() => {
  return props.mode === 'available' ? filteredItems.value : props.items
})

const shouldShowGroupedView = computed(() => {
  return (
    props.isGrouped &&
    props.mode === 'available' &&
    Object.keys(groupedItems.value).length > 0
  )
})

const showNoResults = computed(() => {
  return displayItems.value.length === 0
})

const noResultsMessage = computed(() => {
  if (localSearchTerm.value) {
    return 'No parameters match your search'
  }
  return props.mode === 'active' ? 'No active columns' : 'No available columns'
})

// Helper functions
const getAbsoluteIndex = (categoryIndex: number, itemIndex: number): number => {
  let absoluteIndex = 0
  for (let i = 0; i < categoryIndex; i++) {
    const category = sortedCategories.value[i]
    absoluteIndex += groupedItems.value[category]?.length || 0
  }
  return absoluteIndex + itemIndex
}

// Event handlers
const handleAdd = (item: ParameterDefinition) => {
  emit('add', item)
}

const handleRemove = (item: ColumnDef | ParameterDefinition) => {
  emit('remove', item)
}

const handleVisibilityChange = (
  item: ColumnDef | ParameterDefinition,
  visible: boolean
) => {
  emit('visibility-change', item, visible)
}

const handleItemDragLeave = () => {
  dragOverIndex.value = null
}

// Update drag start to include all necessary data
const handleDragStart = (
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) => {
  if (!event.dataTransfer) return

  const dragData = {
    item: {
      field: item.field,
      header: item.header,
      type: item.type,
      category: item.category
      // Include other necessary properties but avoid circular references
    },
    sourceIndex: index,
    sourceList: props.mode
  }

  console.log('Drag start:', {
    mode: props.mode,
    index,
    field: item.field
  })

  event.dataTransfer.setData('application/json', JSON.stringify(dragData))
  event.dataTransfer.effectAllowed = 'move'

  // Set drag image if needed
  const dragElement = event.target as HTMLElement
  event.dataTransfer.setDragImage(dragElement, 0, 0)

  emit('drag-start', event, item, index)
}

// Handle drag over to show proper drop position
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  const element = event.currentTarget as HTMLElement
  const rect = element.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  // Update visual indicator
  return mouseY < threshold ? 'above' : 'below'
}

const handleListDragEnter = () => {
  // Handle list-level drag enter if needed
}

const handleListDragLeave = (event: DragEvent) => {
  if (
    event.target instanceof HTMLElement &&
    !event.currentTarget?.contains(event.relatedTarget as Node)
  ) {
    dragOverIndex.value = null
  }
}

const handleListDrop = () => {
  draggedItemIndex.value = null
  dragOverIndex.value = null
}

// Sort options
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
  @apply sticky top-0 z-10;
}

/* Smooth transitions for drag and drop */
.column-list-item {
  @apply transition-all duration-200;
}

.drop-indicator {
  @apply transition-transform duration-200;
}
</style>
