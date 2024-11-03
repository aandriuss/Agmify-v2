<template>
  <div class="flex-1 border rounded flex flex-col">
    <!-- Header Section -->
    <div class="p-3 border-b bg-gray-50 space-y-3">
      <h3 class="font-medium text-sm">Available Parameters</h3>

      <!-- Search Bar -->
      <div class="relative">
        <i
          class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        />
        <input
          v-model="localSearchTerm"
          type="text"
          placeholder="Search parameters..."
          class="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button
          v-if="localSearchTerm"
          icon="pi pi-times"
          text
          severity="secondary"
          class="absolute right-2 top-1/2 transform -translate-y-1/2"
          @click="clearFilters"
        />
      </div>

      <!-- Filter Controls -->
      <div class="flex items-center gap-2">
        <Menu as="div" class="relative">
          <MenuButton
            class="px-2 py-1 text-sm border rounded-md hover:bg-gray-50 flex items-center gap-1"
          >
            <i class="pi pi-sliders-h" />
            Filters
          </MenuButton>

          <MenuItems
            class="absolute left-0 mt-1 w-56 bg-white border rounded-md shadow-lg p-1 z-10"
          >
            <MenuItem v-slot="{ active }">
              <button
                :class="[
                  'w-full text-left px-2 py-1 text-sm rounded',
                  active ? 'bg-gray-100' : ''
                ]"
                @click="toggleGrouping"
              >
                <div class="flex items-center gap-2">
                  <Checkbox :model-value="localIsGrouped" :binary="true" />
                  Group by Category
                </div>
              </button>
            </MenuItem>

            <div class="h-px bg-gray-200 my-1" />

            <div class="px-2 py-1">
              <div class="text-xs font-medium text-gray-500 mb-1">Sort by</div>
              <RadioGroup v-model="localSortBy" class="space-y-1">
                <RadioGroupOption
                  v-for="option in sortOptions"
                  :key="option.value"
                  v-slot="{ checked }"
                  :value="option.value"
                >
                  <button
                    class="w-full flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-gray-50"
                    :class="{ 'bg-blue-50': checked }"
                  >
                    <div
                      class="w-3 h-3 rounded-full border"
                      :class="{ 'bg-blue-500 border-blue-500': checked }"
                    />
                    {{ option.label }}
                  </button>
                </RadioGroupOption>
              </RadioGroup>
            </div>
          </MenuItems>
        </Menu>

        <button
          v-if="hasFilters"
          class="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
          @click="clearFilters"
        >
          <i class="pi pi-times mr-1" />
          Clear All
        </button>
      </div>
    </div>

    <!-- Parameters List -->
    <div class="flex-1 overflow-y-auto p-1 space-y-1">
      <!-- When Grouped -->
      <template v-if="localIsGrouped">
        <div v-for="group in groupedParameters" :key="group.category" class="space-y-1">
          <div class="px-2 py-1 bg-gray-50 text-sm font-medium rounded">
            {{ group.category }}
          </div>
          <div class="space-y-1 pl-2">
            <template v-for="param in group.parameters" :key="param.field">
              <ParameterItem
                :parameter="param"
                :is-active="isParameterActive(param)"
                draggable="true"
                @add="$emit('add', param)"
                @dragstart="$emit('drag-start', $event, param)"
              />
            </template>
          </div>
        </div>
      </template>

      <!-- When Not Grouped -->
      <template v-else>
        <ParameterItem
          v-for="param in filteredParameters"
          :key="param.field"
          :parameter="param"
          :is-active="isParameterActive(param)"
          draggable="true"
          @add="$emit('add', param)"
          @dragstart="$emit('drag-start', $event, param)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  RadioGroup,
  RadioGroupOption
} from '@headlessui/vue'
import ParameterItem from '../../../../../../components/parameters/ParameterItem.vue'
import type { ParameterDefinition } from '../../../composables/types'
// components/viewer/components/tables/DataTable/components/ColumnManager/AvailableColumns/index.vue
// components/viewer/components/tables/DataTable/composables/useParameterFiltering.ts
// import SearchBar from './SearchBar.vue'
// import FilterControls from './FilterControls.vue'
// import ParametersList from './ParametersList.vue'
import { useParameterFiltering } from '~/components/viewer/components/tables/DataTable/composables/useParameterFiltering'

import EnhancedColumnList from '../EnhancedColumnList.vue'

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

// const handleClearFilters = () => {
//   emit('update:searchTerm', '')
//   emit('update:sortBy', 'category')
//   emit('update:isGrouped', true)
// }

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

// Use parameter filtering composable
// const { filteredParameters, groupedParameters } = useParameterFiltering({
//   parameters: props.parameters,
//   searchTerm: localSearchTerm,
//   isGrouped: localIsGrouped,
//   sortBy: localSortBy
// })

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
