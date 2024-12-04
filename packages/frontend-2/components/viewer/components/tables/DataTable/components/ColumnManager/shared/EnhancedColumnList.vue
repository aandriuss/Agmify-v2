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
              <button
                v-for="(item, index) in group.items"
                :key="item.field"
                type="button"
                class="w-full flex items-center gap-2 p-1 rounded hover:bg-gray-50 text-left"
                draggable="true"
                @dragstart="handleDragStart($event, item, index)"
                @dragend="$emit('drag-end')"
                @dragenter.prevent="$emit('drag-enter', $event, index)"
                @drop.prevent="$emit('drop', $event, index)"
                @dragover.prevent
              >
                <div class="flex-1">
                  <div class="text-sm">{{ item.header }}</div>
                </div>

                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    class="p-1 text-blue-600 hover:text-blue-800"
                    @click.stop="$emit('add', item)"
                  >
                    <PlusIcon class="w-4 h-4" />
                    <span class="sr-only">Add {{ item.header }}</span>
                  </button>
                </div>
              </button>
            </div>
          </div>
        </template>

        <!-- Active Parameters or Ungrouped Available Parameters -->
        <template v-else>
          <button
            v-for="(item, index) in items"
            :key="item.field"
            type="button"
            class="w-full flex items-center gap-2 p-1 rounded hover:bg-gray-50 text-left"
            :class="{
              'text-gray-400': mode === 'active' && !item.visible
            }"
            draggable="true"
            @dragstart="handleDragStart($event, item, index)"
            @dragend="$emit('drag-end')"
            @dragenter.prevent="$emit('drag-enter', $event, index)"
            @drop.prevent="$emit('drop', $event, index)"
            @dragover.prevent
          >
            <div class="flex-1">
              <div class="text-sm">{{ item.header }}</div>
              <div v-if="mode === 'available'" class="text-xs text-gray-500">
                {{ getItemGroup(item) }}
              </div>
            </div>

            <div class="flex items-center gap-1">
              <button
                v-if="mode === 'available'"
                type="button"
                class="p-1 text-blue-600 hover:text-blue-800"
                @click.stop="$emit('add', item)"
              >
                <PlusIcon class="w-4 h-4" />
                <span class="sr-only">Add {{ item.header }}</span>
              </button>
              <button
                v-if="mode === 'active' && item.removable"
                type="button"
                class="p-1 text-red-600 hover:text-red-800"
                @click.stop="$emit('remove', item)"
              >
                <MinusIcon class="w-4 h-4" />
                <span class="sr-only">Remove {{ item.header }}</span>
              </button>
              <button
                v-if="mode === 'active'"
                type="button"
                class="p-1"
                :class="{
                  'text-blue-600 hover:text-blue-800': !item.visible,
                  'text-gray-400 hover:text-gray-600': item.visible
                }"
                @click.stop="$emit('visibility-change', item, !item.visible)"
              >
                <EyeIcon v-if="item.visible" class="w-4 h-4" />
                <EyeSlashIcon v-else class="w-4 h-4" />
                <span class="sr-only">
                  {{ item.visible ? 'Hide' : 'Show' }} {{ item.header }}
                </span>
              </button>
            </div>
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  PlusIcon,
  MinusIcon,
  EyeIcon,
  EyeSlashIcon,
  ChevronRightIcon,
  ChevronDownIcon
} from '@heroicons/vue/24/outline'
import type { ColumnDef, UnifiedParameter } from '~/composables/core/types'

interface Props {
  items: (ColumnDef | UnifiedParameter)[]
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
  add: [item: UnifiedParameter | ColumnDef]
  remove: [item: UnifiedParameter | ColumnDef]
  'drag-start': [event: DragEvent, item: UnifiedParameter | ColumnDef, index: number]
  'drag-end': []
  'drag-enter': [event: DragEvent, index: number]
  drop: [event: DragEvent, index: number]
  'visibility-change': [item: UnifiedParameter | ColumnDef, visible: boolean]
}>()

const localSearchTerm = ref(props.searchTerm)
const expandedGroups = ref<Set<string>>(new Set())

// Helper to get group name from item
function getItemGroup(item: ColumnDef | UnifiedParameter): string {
  if ('fetchedGroup' in item) {
    return item.fetchedGroup || 'Uncategorized'
  }
  if ('source' in item) {
    return item.source || 'Uncategorized'
  }
  return item.category || 'Uncategorized'
}

const groupedItems = computed(() => {
  const groups: Record<
    string,
    { group: string; items: (ColumnDef | UnifiedParameter)[] }
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
      // Essential groups first
      if (a.group === 'Properties') return -1
      if (b.group === 'Properties') return 1
      if (a.group === 'Parameters') return -1
      if (b.group === 'Parameters') return 1
      if (a.group === 'Dimensions') return -1
      if (b.group === 'Dimensions') return 1
      // Then sort alphabetically
      return a.group.localeCompare(b.group)
    })
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.header.localeCompare(b.header))
    }))
})

function handleDragStart(
  event: DragEvent,
  item: UnifiedParameter | ColumnDef,
  index: number
) {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.dropEffect = 'move'
    event.dataTransfer.setData('text/plain', item.field)
  }
  emit('drag-start', event, item, index)
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
