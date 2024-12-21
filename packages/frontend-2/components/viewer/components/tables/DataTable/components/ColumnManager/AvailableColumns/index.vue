<template>
  <div class="flex-1 border rounded flex flex-col">
    <EnhancedColumnList
      :items="filteredParameters"
      mode="available"
      :search-term="searchTerm"
      :is-grouped="isGrouped"
      :sort-by="sortBy"
      show-filter-options
      @update:search-term="$emit('update:searchTerm', $event)"
      @update:is-grouped="$emit('update:isGrouped', $event)"
      @update:sort-by="handleSortChange"
      @add="handleAdd"
      @remove="handleRemove"
      @drag-start="handleDragStart"
      @drag-end="handleDragEnd"
      @drag-enter="handleDragEnter"
      @drop="handleDrop"
      @visibility-change="handleVisibilityChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TableColumn } from '~/composables/core/types/tables'
import type { Parameter } from '~/composables/core/types/parameters/parameter-types'
import { useParameterFiltering } from '~/composables/parameters/useParameterFiltering'
import EnhancedColumnList from '../shared/EnhancedColumnList.vue'

const props = defineProps<{
  parameters: TableColumn[]
  searchTerm: string
  isGrouped: boolean
  sortBy: 'name' | 'category' | 'type' | 'fixed'
  activeColumns: { field: string }[]
}>()

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:isGrouped': [value: boolean]
  'update:sortBy': [value: 'name' | 'category' | 'type' | 'fixed']
  add: [param: TableColumn]
  'drag-start': [event: DragEvent, param: TableColumn]
}>()

const { filteredParameters } = useParameterFiltering({
  parameters: props.parameters,
  searchTerm: computed(() => props.searchTerm),
  isGrouped: computed(() => props.isGrouped),
  sortBy: computed(() => props.sortBy)
})

// Methods
const handleAdd = (item: TableColumn | Parameter) => {
  if (!isParameterActive(item) && 'field' in item) {
    emit('add', item as TableColumn)
  }
}

const handleRemove = (_item: TableColumn | Parameter) => {
  // No-op for available columns
}

const handleDragStart = (
  event: DragEvent,
  item: TableColumn | Parameter,
  _index: number
) => {
  if ('field' in item) {
    emit('drag-start', event, item as TableColumn)
  }
}

const handleDragEnd = () => {
  // No-op for available columns
}

const handleDragEnter = (_event: DragEvent, _index: number) => {
  // No-op for available columns
}

const handleDrop = (_event: DragEvent, _index: number) => {
  // No-op for available columns
}

const handleVisibilityChange = (_item: TableColumn | Parameter, _visible: boolean) => {
  // No-op for available columns
}

const handleSortChange = (value: string) => {
  if (
    value === 'name' ||
    value === 'category' ||
    value === 'type' ||
    value === 'fixed'
  ) {
    emit('update:sortBy', value)
  }
}

// Computed properties
const isParameterActive = (item: TableColumn | Parameter) => {
  return 'field' in item && props.activeColumns.some((col) => col.field === item.field)
}
</script>
