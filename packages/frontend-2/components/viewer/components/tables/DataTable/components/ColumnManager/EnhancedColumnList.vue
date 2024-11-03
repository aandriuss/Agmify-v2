<template>
  <div class="flex-1 overflow-y-auto p-1 space-y-1">
    <!-- Search bar for available columns mode -->
    <template v-if="props.mode === 'available'">
      <div class="relative mb-3">
        <i
          class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="searchTerm"
          type="text"
          placeholder="Search columns..."
          class="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          v-if="searchTerm"
          icon="pi pi-times"
          text
          severity="secondary"
          class="absolute right-2 top-1/2 transform -translate-y-1/2"
          @click="clearSearch"
        />
      </div>

      <!-- Grouping toggle -->
      <div v-if="hasMultipleCategories" class="mb-3">
        <div class="flex items-center gap-2">
          <Checkbox v-model="isGrouped" :binary="true" />
          <label class="text-sm">Group by Category</label>
        </div>
      </div>
    </template>

    <!-- Grouped View -->
    <template v-if="shouldShowGroupedView && groupedColumns?.length">
      <div v-for="group in groupedColumns" :key="group.category" class="space-y-1">
        <div class="px-2 py-1 bg-gray-50 text-sm font-medium rounded">
          {{ group.category }}
          <span class="text-xs text-gray-500 ml-1">
            ({{ group.columns?.length || 0 }})
          </span>
        </div>
        <div class="space-y-1 pl-2">
          <ColumnListItem
            v-for="(column, index) in group.columns"
            :key="column.field"
            :column="column"
            :mode="props.mode"
            :is-dragging-over="
              dragOverIndex === getAbsoluteIndex(group.category, index)
            "
            :drag-enabled="props.mode === 'active'"
            @remove="handleRemove(column)"
            @visibility-change="handleVisibilityChange(column, $event)"
            @dragstart="
              handleDragStart($event, column, getAbsoluteIndex(group.category, index))
            "
            @dragenter="handleDragEnter(getAbsoluteIndex(group.category, index))"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, getAbsoluteIndex(group.category, index))"
          />
        </div>
      </div>
    </template>

    <!-- Flat View -->
    <template v-else>
      <ColumnListItem
        v-for="(column, index) in filteredColumns"
        :key="column.field"
        :column="column"
        :mode="props.mode"
        :is-dragging-over="dragOverIndex === index"
        :drag-enabled="props.mode === 'active'"
        @remove="handleRemove(column)"
        @visibility-change="handleVisibilityChange(column, $event)"
        @dragstart="handleDragStart($event, column, index)"
        @dragenter="handleDragEnter(index)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, index)"
      />
      <div
        v-if="!filteredColumns?.length"
        class="p-4 text-center text-gray-500 text-sm"
      >
        {{ noResultsMessage }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ColumnListItem from '../ColumnManager/ColumnListItem.vue'
import { useColumnManagement } from '../../composables/useColumnManagement'
import type { ColumnDef } from '../../composables/types'

const props = withDefaults(
  defineProps<{
    columns: ColumnDef[]
    mode: 'active' | 'available'
  }>(),
  {
    columns: () => [],
    mode: 'active'
  }
)

const emit = defineEmits<{
  'update:columns': [columns: ColumnDef[]]
  remove: [column: ColumnDef]
  'visibility-change': [column: ColumnDef, visible: boolean]
}>()

// Local state
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref('category' as const)

// Column management
const {
  columns: managedColumns,
  dragOverIndex,
  filteredColumns,
  groupedColumns,
  updateColumns,
  handleDragStart,
  handleDragEnter,
  handleDragLeave,
  handleDrop
} = useColumnManagement({
  initialColumns: props.columns,
  searchTerm,
  isGrouped,
  sortBy
})

// Computed properties with safety checks
const hasMultipleCategories = computed(() => {
  const columnsList = props.columns || []
  const categories = new Set(columnsList.map((col) => col.category || 'Other'))
  return categories.size > 1
})

const shouldShowGroupedView = computed(
  () =>
    isGrouped.value &&
    props.mode === 'available' && // Fixed: Added props reference
    hasMultipleCategories.value
)

const noResultsMessage = computed(() => {
  if (searchTerm.value) {
    return 'No columns match your search'
  }
  return props.mode === 'active' ? 'No active columns' : 'No available columns' // Fixed: Added props reference
})

// Methods
const clearSearch = () => {
  searchTerm.value = ''
}

const handleRemove = (column: ColumnDef) => {
  if (props.mode === 'active' && !column.removable) return // Fixed: Added props reference
  emit('remove', column)
}

const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  const updatedColumns = (managedColumns.value || []).map((col) => {
    if (col.field === column.field) {
      return { ...col, visible }
    }
    return col
  })
  updateColumns(updatedColumns)
  emit('visibility-change', column, visible)
}

// Helper function for grouped view with safety check
const getAbsoluteIndex = (category: string, groupIndex: number) => {
  let absoluteIndex = 0
  const groups = groupedColumns.value || []
  for (const group of groups) {
    if (group.category === category) {
      return absoluteIndex + groupIndex
    }
    absoluteIndex += group.columns.length
  }
  return groupIndex
}

// Watch for external changes
watch(
  () => props.columns,
  (newColumns) => {
    updateColumns(newColumns || [])
  },
  { deep: true }
)
</script>
