<template>
  <div>
    <!-- Always visible search row -->
    <div class="p-2 bg-gray-50 border-b">
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <input
            id="search-input"
            v-model="localSearchTerm"
            type="text"
            placeholder="Search..."
            class="w-full px-2 py-1 pl-8 border rounded text-sm"
            @input="$emit('update:search-term', localSearchTerm)"
          />
          <MagnifyingGlassIcon class="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
        </div>
        <button class="p-1 hover:bg-gray-200 rounded" @click="toggleExpanded">
          <component
            :is="isExpanded ? ChevronUpIcon : ChevronDownIcon"
            class="h-4 w-4 text-gray-500"
          />
        </button>
      </div>
    </div>

    <!-- Expandable options -->
    <div v-if="isExpanded" class="p-2 bg-gray-50 border-b">
      <div class="flex flex-col gap-2">
        <!-- Grouping -->
        <div v-if="showGrouping" class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-sm">
            <input
              id="group-checkbox"
              :checked="isGrouped"
              type="checkbox"
              @change="$emit('update:is-grouped', !isGrouped)"
            />
            <span>Group parameters</span>
          </label>
        </div>

        <!-- Sort -->
        <div v-if="showSorting" class="flex items-center gap-1">
          <label for="sort-select" class="text-sm">Sort by:</label>
          <select
            id="sort-select"
            :value="sortBy"
            :disabled="isGrouped"
            class="px-2 py-1 rounded border bg-background text-sm h-7 w-32"
            @change="handleSortChange"
          >
            <option value="name">Name</option>
            <option value="category">Group</option>
            <option value="type">Type</option>
            <option value="fixed">Favorite First</option>
          </select>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/vue/24/solid'

interface Props {
  searchTerm?: string
  isGrouped?: boolean
  sortBy?: 'name' | 'category' | 'type' | 'fixed'
  showGrouping?: boolean
  showSorting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchTerm: '',
  isGrouped: true,
  sortBy: 'name',
  showGrouping: true,
  showSorting: true
})

const emit = defineEmits<{
  'update:search-term': [value: string]
  'update:is-grouped': [value: boolean]
  'update:sort-by': [value: string]
}>()

const localSearchTerm = ref(props.searchTerm)
const isExpanded = ref(false)

// Watch for external changes to searchTerm
watch(
  () => props.searchTerm,
  (newValue) => {
    localSearchTerm.value = newValue
  }
)

function handleSortChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:sort-by', target.value)
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}
</script>
