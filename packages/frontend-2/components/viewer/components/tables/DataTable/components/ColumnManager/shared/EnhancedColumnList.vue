<template>
  <div class="flex flex-col h-full">
    <!-- Filter Options -->
    <div v-if="showFilterOptions" class="p-2 border-b bg-gray-50">
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

        <!-- Grouping (only for available parameters) -->
        <div v-if="mode === 'available'" class="flex items-center gap-2">
          <label class="flex items-center gap-1 text-sm">
            <input
              id="group-checkbox"
              :checked="isGrouped"
              type="checkbox"
              @change="$emit('update:is-grouped', !isGrouped)"
            />
            <span>Group by category</span>
          </label>
        </div>

        <!-- Sort (only for available parameters) -->
        <div v-if="mode === 'available'" class="flex items-center gap-1">
          <label for="sort-select" class="text-sm">Sort by:</label>
          <select
            id="sort-select"
            :value="sortBy"
            class="px-2 py-1 rounded border bg-background text-sm h-7 w-32"
            @change="handleSortChange"
          >
            <option value="name">Name</option>
            <option value="category">Category</option>
            <option value="type">Type</option>
            <option value="fixed">Favorite First</option>
          </select>
        </div>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <div
        class="p-2"
        :class="{
          'space-y-4': isGrouped && mode === 'available',
          'space-y-1': !isGrouped || mode === 'active'
        }"
      >
        <!-- Available Parameters with Grouping -->
        <template v-if="isGrouped && mode === 'available'">
          <div v-for="group in groupedItems" :key="group.group" class="space-y-1">
            <!-- Group Header -->
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
                @click="toggleGroup(group.group)"
              >
                <ChevronRightIcon
                  v-if="!isGroupExpanded(group.group)"
                  class="w-4 h-4"
                />
                <ChevronDownIcon v-else class="w-4 h-4" />
                {{ group.group }}
                <span class="text-xs text-gray-500">({{ group.items.length }})</span>
              </button>
            </div>

            <!-- Group Items -->
            <div v-show="isGroupExpanded(group.group)" class="space-y-1 ml-4">
              <ColumnListItem
                v-for="(item, index) in group.items"
                :key="getItemId(item)"
                :column="item"
                :mode="mode"
                :index="index"
                :drop-position="dropPosition"
                @add="handleAdd"
                @remove="handleRemove"
                @drag-start="handleDragStart"
                @drag-end="handleDragEnd"
                @drag-enter="handleDragEnter"
                @drop="handleDrop"
                @visibility-change="handleVisibilityChange"
              />
            </div>
          </div>
        </template>

        <!-- Active Parameters or Ungrouped Available Parameters -->
        <template v-else>
          <ColumnListItem
            v-for="(item, index) in items"
            :key="getItemId(item)"
            :column="item"
            :mode="mode"
            :index="index"
            :drop-position="dropPosition"
            @add="handleAdd"
            @remove="handleRemove"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @drag-enter="handleDragEnter"
            @drop="handleDrop"
            @visibility-change="handleVisibilityChange"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import type {
  TableColumn,
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types'
import {
  isAvailableBimParameter,
  isAvailableUserParameter
} from '~/composables/core/types'
import ColumnListItem from './ColumnListItem.vue'

type AvailableParameter = AvailableBimParameter | AvailableUserParameter

interface Props {
  items: (TableColumn | AvailableParameter)[]
  mode: 'active' | 'available'
  showFilterOptions?: boolean
  searchTerm?: string
  isGrouped?: boolean
  sortBy?: 'name' | 'category' | 'type' | 'fixed'
  dropPosition?: 'above' | 'below' | null
}

const props = withDefaults(defineProps<Props>(), {
  showFilterOptions: false,
  searchTerm: '',
  isGrouped: true,
  sortBy: 'name',
  dropPosition: null
})

const emit = defineEmits<{
  'update:search-term': [value: string]
  'update:is-grouped': [value: boolean]
  'update:sort-by': [value: string]
  add: [item: AvailableParameter]
  remove: [item: TableColumn]
  'drag-start': [
    event: DragEvent,
    item: AvailableParameter | TableColumn,
    index: number
  ]
  'drag-end': []
  'drag-enter': [event: DragEvent, index: number]
  drop: [event: DragEvent, index: number]
  'visibility-change': [item: TableColumn, visible: boolean]
}>()

const localSearchTerm = ref(props.searchTerm)
const expandedGroups = ref<Set<string>>(new Set())

// Type Guards
function isColumn(item: AvailableParameter | TableColumn): item is TableColumn {
  return 'parameter' in item
}

// Helper Functions
function getItemId(item: AvailableParameter | TableColumn): string {
  return isColumn(item) ? item.id : item.id
}

function getItemName(item: AvailableParameter | TableColumn): string {
  return isColumn(item) ? item.parameter.name : item.name
}

function getParameterGroup(item: AvailableParameter): string {
  if (isAvailableBimParameter(item)) {
    return item.category || 'BIM Parameters'
  }
  if (isAvailableUserParameter(item)) {
    return item.category || 'User Parameters'
  }
  return 'Uncategorized'
}

function getItemGroup(item: AvailableParameter | TableColumn): string {
  if (isColumn(item)) {
    return item.parameter.category || 'Uncategorized'
  }
  return getParameterGroup(item)
}

const groupedItems = computed(() => {
  const groups: Record<
    string,
    { group: string; items: (AvailableParameter | TableColumn)[] }
  > = {}

  props.items.forEach((item) => {
    const group = getItemGroup(item)
    if (!groups[group]) {
      groups[group] = {
        group,
        items: []
      }
    }
    groups[group].items.push(item)
  })

  // Sort groups by name, but keep essential groups at the top
  return Object.values(groups)
    .sort((a, b) => {
      // BIM groups first
      if (a.group.startsWith('BIM') && !b.group.startsWith('BIM')) return -1
      if (!a.group.startsWith('BIM') && b.group.startsWith('BIM')) return 1
      // Then sort alphabetically
      return a.group.localeCompare(b.group)
    })
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        // Sort by name within groups
        const nameA = getItemName(a)
        const nameB = getItemName(b)
        return nameA.localeCompare(nameB)
      })
    }))
})

// Event Handlers
function handleAdd(item: AvailableParameter) {
  emit('add', item)
}

function handleRemove(item: TableColumn) {
  emit('remove', item)
}

function handleDragStart(
  event: DragEvent,
  item: AvailableParameter | TableColumn,
  index: number
) {
  emit('drag-start', event, item, index)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleDragEnd(event: DragEvent) {
  emit('drag-end')
}

function handleDragEnter(event: DragEvent, index: number) {
  emit('drag-enter', event, index)
}

function handleDrop(event: DragEvent, index: number) {
  emit('drop', event, index)
}

function handleVisibilityChange(item: TableColumn, visible: boolean) {
  emit('visibility-change', item, visible)
}

function handleSortChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:sort-by', target.value)
}

function toggleGroup(group: string) {
  if (expandedGroups.value.has(group)) {
    expandedGroups.value.delete(group)
  } else {
    expandedGroups.value.add(group)
  }
}

function isGroupExpanded(group: string): boolean {
  return expandedGroups.value.has(group)
}

// Initialize with all groups expanded
groupedItems.value.forEach((group) => {
  expandedGroups.value.add(group.group)
})
</script>

<style scoped>
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f7fafc;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e0;
  border-radius: 3px;
}
</style>
