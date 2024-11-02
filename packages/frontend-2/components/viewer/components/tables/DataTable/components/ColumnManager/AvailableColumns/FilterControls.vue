<template>
  <div class="flex gap-2">
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
            @click="$emit('update:isGrouped', !isGrouped)"
          >
            <div class="flex items-center gap-2">
              <Checkbox :model-value="isGrouped" :binary="true" />
              Group by Category
            </div>
          </button>
        </MenuItem>

        <div class="h-px bg-gray-200 my-1" />

        <div class="px-2 py-1">
          <div class="text-xs font-medium text-gray-500 mb-1">Sort by</div>
          <RadioGroup
            :model-value="sortBy"
            class="space-y-1"
            @update:model-value="$emit('update:sortBy', $event)"
          >
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
      @click="$emit('clear')"
    >
      <i class="pi pi-times mr-1" />
      Clear All
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Checkbox from 'primevue/checkbox'
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  RadioGroup,
  RadioGroupOption
} from '@headlessui/vue'

type SortOption = 'name' | 'category' | 'type' | 'fixed'

const props = defineProps<{
  isGrouped: boolean
  sortBy: SortOption
  searchTerm: string
}>()

const emit = defineEmits<{
  'update:isGrouped': [value: boolean]
  'update:sortBy': [value: SortOption]
  clear: []
}>()

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'fixed', label: 'Fixed First' }
] as const

const hasFilters = computed(() => {
  return props.searchTerm || props.sortBy !== 'category' || !props.isGrouped
})
</script>
