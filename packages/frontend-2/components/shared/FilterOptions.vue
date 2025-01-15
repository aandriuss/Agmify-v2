<template>
  <div class="p-2 border-b bg-gray-50">
    <div class="flex flex-col gap-2">
      <!-- Search -->
      <div class="flex items-center gap-2">
        <label for="search-input" class="sr-only">Search parameters</label>
        <input
          id="search-input"
          v-model="localSearchTerm"
          type="text"
          placeholder="Search..."
          class="w-full px-2 py-1 border rounded text-sm"
          @input="$emit('update:search-term', localSearchTerm)"
        />
      </div>

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
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  searchTerm?: string
  isGrouped?: boolean
  sortBy?: 'name' | 'category' | 'type' | 'fixed'
  showGrouping?: boolean
  showSorting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  searchTerm: '',
  isGrouped: false,
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
</script>
