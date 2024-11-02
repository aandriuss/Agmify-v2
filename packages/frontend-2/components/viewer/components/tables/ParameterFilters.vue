<template>
  <div class="space-y-3">
    <!-- Search -->
    <div class="relative flex">
      <span class="p-input-icon-left flex-1">
        <i class="pi pi-search" />
        <InputText
          v-model="searchTerm"
          type="text"
          placeholder="Search parameters..."
          class="w-full p-inputtext-sm"
        />
      </span>
      <Button
        v-if="searchTerm"
        icon="pi pi-times"
        severity="secondary"
        text
        class="p-button-sm ml-1"
        @click="searchTerm = ''"
      />
    </div>

    <!-- Filter Controls -->
    <div class="flex flex-wrap gap-2">
      <Menu ref="menu" class="relative">
        <template #button>
          <Button class="p-button-sm" severity="secondary" icon="pi pi-sliders-h">
            <span class="ml-2">Filters</span>
            <Badge
              v-if="selectedFiltersCount"
              :value="selectedFiltersCount"
              severity="info"
              class="ml-2"
            />
          </Button>
        </template>

        <div class="p-2 space-y-3">
          <!-- Grouping -->
          <div>
            <div class="flex items-center gap-2 p-2">
              <Checkbox
                v-model="isGrouped"
                :binary="true"
                input-id="group-by-category"
              />
              <label for="group-by-category" class="text-sm">Group by Category</label>
            </div>
          </div>

          <!-- Sort Options -->
          <div>
            <div class="text-xs font-medium text-gray-500 mb-1 p-2">Sort by</div>
            <div class="space-y-1">
              <div
                v-for="option in sortOptions"
                :key="option.value"
                class="flex items-center p-2 hover:bg-gray-50"
              >
                <RadioButton
                  v-model="sortBy"
                  :value="option.value"
                  :input-id="'sort-' + option.value"
                />
                <label :for="'sort-' + option.value" class="ml-2 text-sm">
                  {{ option.label }}
                </label>
              </div>
            </div>
          </div>

          <!-- Category Filter -->
          <div v-if="availableCategories.length">
            <div class="text-xs font-medium text-gray-500 mb-1 p-2">Categories</div>
            <div class="space-y-1">
              <div
                v-for="category in availableCategories"
                :key="category"
                class="flex items-center p-2 hover:bg-gray-50"
              >
                <Checkbox
                  v-model="selectedCategories"
                  :value="category"
                  :input-id="'category-' + category"
                />
                <label :for="'category-' + category" class="ml-2 text-sm">
                  {{ category }}
                </label>
              </div>
            </div>
          </div>

          <!-- Type Filter -->
          <div v-if="availableTypes.length">
            <div class="text-xs font-medium text-gray-500 mb-1 p-2">
              Parameter Types
            </div>
            <div class="space-y-1">
              <div
                v-for="type in availableTypes"
                :key="type"
                class="flex items-center p-2 hover:bg-gray-50"
              >
                <Checkbox
                  v-model="selectedTypes"
                  :value="type"
                  :input-id="'type-' + type"
                />
                <label :for="'type-' + type" class="ml-2 text-sm">
                  {{ type }}
                </label>
              </div>
            </div>
          </div>
        </div>
      </Menu>

      <Button
        v-if="hasFilters"
        icon="pi pi-times"
        label="Clear All"
        text
        severity="secondary"
        class="p-button-sm"
        @click="$emit('clear')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import Checkbox from 'primevue/checkbox'
import RadioButton from 'primevue/radiobutton'
import Badge from 'primevue/badge'

const props = defineProps<{
  searchTerm: string
  sortBy: 'name' | 'category' | 'type' | 'fixed'
  isGrouped: boolean
  selectedCategories: string[]
  selectedTypes: string[]
  availableCategories: string[]
  availableTypes: string[]
  hasFilters: boolean
}>()

const emit = defineEmits<{
  'update:searchTerm': [value: string]
  'update:sortBy': [value: 'name' | 'category' | 'type' | 'fixed']
  'update:isGrouped': [value: boolean]
  'update:selectedCategories': [value: string[]]
  'update:selectedTypes': [value: string[]]
  clear: []
}>()

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'fixed', label: 'Fixed First' }
]

const selectedFiltersCount = computed(() => {
  let count = 0
  if (props.selectedCategories.length) count++
  if (props.selectedTypes.length) count++
  if (props.sortBy !== 'category') count++
  if (!props.isGrouped) count++
  return count || null
})
</script>

<style scoped>
.random {
  display: none;
}
</style>
