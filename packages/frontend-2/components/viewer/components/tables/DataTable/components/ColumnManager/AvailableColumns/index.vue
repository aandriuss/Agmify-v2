<template>
  <div class="flex-1 border rounded flex flex-col">
    <EnhancedColumnList
      :items="parameters"
      mode="available"
      :search-term="searchTerm"
      :is-grouped="isGrouped"
      :sort-by="sortBy"
      @update:search-term="$emit('update:searchTerm', $event)"
      @update:is-grouped="$emit('update:isGrouped', $event)"
      @update:sort-by="$emit('update:sortBy', $event)"
      @remove="handleRemove"
      @add="handleAdd"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ParameterDefinition } from '../../../composables/types'
import { useParameterFiltering } from '../../../../../parameters/composables/useParameterFiltering'

import EnhancedColumnList from '../shared/EnhancedColumnList.vue'

const props = defineProps<{
  parameters: ParameterDefinition[]
  searchTerm: string
  isGrouped: boolean
  sortBy: 'name' | 'category' | 'type' | 'fixed'
  activeColumns: { field: string }[]
}>()

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:isGrouped': [value: boolean]
  'update:sortBy': [value: 'name' | 'category' | 'type' | 'fixed']
  add: [param: ParameterDefinition]
  'drag-start': [event: DragEvent, param: ParameterDefinition]
}>()

const { filteredParameters, groupedParameters } = useParameterFiltering({
  parameters: props.parameters,
  searchTerm: computed(() => props.searchTerm),
  isGrouped: computed(() => props.isGrouped),
  sortBy: computed(() => props.sortBy)
})

// Local state with two-way binding
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

// Sort options
const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'fixed', label: 'Fixed First' }
]

// Computed properties
const hasFilters = computed(() => {
  return (
    localSearchTerm.value || localSortBy.value !== 'category' || !localIsGrouped.value
  )
})

// Methods
const toggleGrouping = () => {
  localIsGrouped.value = !localIsGrouped.value
}

const clearFilters = () => {
  localSearchTerm.value = ''
  localSortBy.value = 'category'
  localIsGrouped.value = true
}

const isParameterActive = (param: ParameterDefinition) => {
  return props.activeColumns.some((col) => col.field === param.field)
}
</script>
