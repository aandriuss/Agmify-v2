<template>
  <div class="h-full flex flex-col">
    <!-- Debug info -->
    <div v-if="mode === 'available'" class="p-2 text-xs text-gray-500">
      Raw items: {{ items.length }} | Filtered: {{ filteredItems.length }} | Groups:
      {{ Object.keys(groupedItems).length }}
    </div>

    <!-- Search and Filter Controls - Only for Available Parameters -->
    <template v-if="props.mode === 'available'">
      <div class="flex px-1 pt-1">
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
    </template>

    <!-- Main content area with proper overflow -->
    <div
      class="flex-1 overflow-y-auto p-2 space-y-1"
      @dragover.prevent
      @dragenter.prevent="handleListDragEnter"
      @dragleave.prevent="handleListDragLeave"
      @drop="handleListDrop"
    >
      <template v-if="isGrouped">
        <div
          v-for="category in sortedCategories"
          :key="category"
          class="parameter-group"
        >
          <div
            class="group-header p-2 bg-gray-50 border-b text-sm font-medium flex justify-between items-center"
          >
            <span>{{ category }}</span>
            <span class="text-xs text-gray-500">
              ({{ groupedItems[category]?.length || 0 }})
            </span>
          </div>
          <div class="group-items">
            <div
              v-for="item in groupedItems[category]"
              :key="item.field"
              class="parameter-item p-2 hover:bg-gray-50 cursor-pointer border-b"
              draggable="true"
              @dragstart="handleDragStart($event, item)"
              @dragover.prevent
              @drop="handleDrop($event, item)"
            >
              <div class="flex items-center gap-2">
                <div class="flex-1">
                  <div class="font-medium">{{ item.header }}</div>
                  <div class="text-xs text-gray-500">{{ item.field }}</div>
                </div>
                <div v-if="item.category" class="text-xs px-2 py-1 bg-gray-100 rounded">
                  {{ item.category }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div
          v-for="item in filteredItems"
          :key="item.field"
          class="parameter-item p-2 hover:bg-gray-50 cursor-pointer border-b"
          draggable="true"
          @dragstart="handleDragStart($event, item)"
          @dragover.prevent
          @drop="handleDrop($event, item)"
        >
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <div class="font-medium">{{ item.header }}</div>
              <div class="text-xs text-gray-500">{{ item.field }}</div>
            </div>
            <div v-if="item.category" class="text-xs px-2 py-1 bg-gray-100 rounded">
              {{ item.category }}
            </div>
          </div>
        </div>
      </template>

      <!-- No Results Message -->
      <div v-if="showNoResults" class="p-4 text-center text-gray-500">
        {{ noResultsMessage }}
      </div>
      <!-- Debug Info -->
      <div class="text-xs p-2 bg-gray-100 border-t">
        <div>Debug Info:</div>
        <div>Mode: {{ mode }}</div>
        <div>Items Count: {{ items?.length || 0 }}</div>
        <div>Display Items Count: {{ displayItems?.length || 0 }}</div>
        <div>Is Grouped View: {{ shouldShowGroupedView ? 'Yes' : 'No' }}</div>
        <div>Groups Count: {{ groupedColumns?.length || 0 }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ColumnDef, ParameterDefinition } from '../../../composables/types'
import { useColumns } from '../../../composables/columns/useColumns'
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

// Debug mounting
onMounted(() => {
  console.log('EnhancedColumnList mounted:', {
    mode: props.mode,
    itemsCount: props.items?.length,
    isGrouped: props.isGrouped,
    items: props.items,
    searchTerm: props.searchTerm,
    sortBy: props.sortBy
  })
})

// Use column management composable
const { columns, filteredColumns, groupedColumns } = useColumns({
  initialColumns: computed(() => props.items),
  searchTerm: computed(() => props.searchTerm),
  isGrouped: computed(() => props.isGrouped),
  sortBy: computed(() => props.sortBy)
})

// Display items computed
const displayItems = computed(() => {
  const result = props.mode === 'available' ? filteredColumns.value : props.items
  console.log('DisplayItems computed:', {
    mode: props.mode,
    itemsCount: props.items?.length,
    filteredCount: filteredColumns.value?.length,
    resultCount: result?.length
  })
  return result
})

// Show debug info when no results
const showNoResults = computed(() => {
  const hasNoItems = !displayItems.value?.length
  if (hasNoItems) {
    console.log('No items to display:', {
      mode: props.mode,
      originalItems: props.items?.length,
      filteredItems: filteredColumns.value?.length
    })
  }
  return hasNoItems
})

const noResultsMessage = computed(() => {
  if (localSearchTerm.value) {
    return 'No parameters match your search'
  }
  return props.mode === 'active' ? 'No active columns' : 'No available columns'
})

// Add detailed logging for the filtering process
const filteredItems = computed(() => {
  console.log('Filtering items:', {
    total: props.items.length,
    searchTerm: props.searchTerm
  })

  let result = [...props.items]

  if (props.searchTerm) {
    const search = props.searchTerm.toLowerCase()
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
const handleListDragEnter = (event: DragEvent) => {
  event.preventDefault()
  if (props.mode === 'available') {
    isDraggingOver.value = true
  }
}

const handleListDragLeave = (event: DragEvent) => {
  event.preventDefault()
  if (
    event.target instanceof HTMLElement &&
    !event.currentTarget?.contains(event.relatedTarget as Node)
  ) {
    isDraggingOver.value = false
  }
}

const handleListDrop = (event: DragEvent) => {
  event.preventDefault()
  console.log('List drop on', props.mode) // Debug

  const jsonData = event.dataTransfer?.getData('application/json')
  if (!jsonData) {
    console.log('No data in transfer')
    return
  }

  try {
    const draggedData = JSON.parse(jsonData)
    console.log('Drop data in list:', draggedData) // Debug log

    // Access item and sourceList from draggedData
    const { item, sourceList } = draggedData

    // Check both source and target before emitting events
    if (props.mode === 'available' && sourceList === 'active') {
      console.log('Emitting remove for item:', item) // Debug log
      emit('remove', item)
    } else if (props.mode === 'active' && sourceList === 'available') {
      console.log('Emitting add for item:', item) // Debug log
      emit('add', item)
    }
  } catch (error) {
    console.error('Error processing list drop:', error)
  }

  resetDragState()
}

const handleDragStart = (
  event: DragEvent,
  item: ColumnDef | ParameterDefinition,
  index: number
) => {
  if (!event.dataTransfer) return
  event.dataTransfer.effectAllowed = 'move'

  const dragData = {
    item,
    sourceList: props.mode,
    index
  }

  console.log('Starting drag:', dragData)
  event.dataTransfer.setData('application/json', JSON.stringify(dragData))
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
  event.stopPropagation()

  console.log('Drop event:', { index, category })

  const jsonData = event.dataTransfer?.getData('application/json')
  if (!jsonData) return

  try {
    const draggedData = JSON.parse(jsonData)
    console.log('Drop data:', draggedData)

    if (draggedData.sourceList === props.mode) {
      // Same list reordering
      const sourceIndex = draggedData.index
      const targetIndex = index

      console.log('Emitting reorder:', { sourceIndex, targetIndex })
      emit('reorder', sourceIndex, targetIndex)
    } else {
      // Moving between lists
      emit('drop', event, index)
    }
  } catch (error) {
    console.error('Error processing drop:', error)
  } finally {
    resetDragState()
  }
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

// Add watcher for items changes
watch(
  () => props.items,
  (newItems) => {
    console.log('Items changed:', {
      newItems,
      length: newItems?.length,
      mode: props.mode
    })
  },
  { immediate: true }
)
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
