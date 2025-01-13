<template>
  <div class="flex flex-col h-full">
    <FilterOptions
      v-if="showFilterOptions"
      :search-term="localSearchTerm"
      :is-grouped="localIsGrouped"
      :sort-by="localSortBy"
      :show-grouping="mode === 'available'"
      :show-sorting="mode === 'available'"
      @update:search-term="handleSearchTermUpdate"
      @update:is-grouped="handleIsGroupedUpdate"
      @update:sort-by="handleSortByUpdate"
    />

    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <div
        class="p-2"
        :class="{
          'space-y-4': localIsGrouped && mode === 'available',
          'space-y-1': !localIsGrouped || mode === 'active'
        }"
      >
        <!-- Available Parameters with Grouping -->
        <template v-if="localIsGrouped && mode === 'available'">
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
                :is-drop-target="index === currentDropIndex"
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
            v-for="(item, index) in sortedItems"
            :key="getItemId(item)"
            :column="item"
            :mode="mode"
            :index="index"
            :is-drop-target="index === currentDropIndex"
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
import ColumnListItem from './ColumnListItem.vue'
import FilterOptions from '~/components/shared/FilterOptions.vue'
import { useFilterAndSort } from '~/composables/shared/useFilterAndSort'

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

// Local state to avoid prop mutations
const localSearchTerm = ref(props.searchTerm)
const localIsGrouped = ref(props.isGrouped)
const localSortBy = ref(props.sortBy)
const expandedGroups = ref<Set<string>>(new Set())
const currentDropIndex = ref<number | null>(null)

// Update handlers
function handleSearchTermUpdate(value: string) {
  localSearchTerm.value = value
  emit('update:search-term', value)
}

function handleIsGroupedUpdate(value: boolean) {
  localIsGrouped.value = value
  emit('update:is-grouped', value)
}

function handleSortByUpdate(value: string) {
  localSortBy.value = value as 'name' | 'category' | 'type' | 'fixed'
  emit('update:sort-by', value)
}

// Type Guards
function isColumn(item: AvailableParameter | TableColumn): item is TableColumn {
  return 'parameter' in item
}

// Helper Functions
function getItemId(item: AvailableParameter | TableColumn): string {
  if (isColumn(item)) {
    return `col_${item.parameter.id}`
  }
  return `param_${item.id}`
}

// Use filter and sort composable
const { sortedItems, groupedItems } = useFilterAndSort({
  items: computed(() => props.items),
  searchTerm: localSearchTerm,
  isGrouped: localIsGrouped,
  sortBy: localSortBy
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
  currentDropIndex.value = null
  emit('drag-start', event, item, index)
}

function handleDragEnd(_event: DragEvent) {
  currentDropIndex.value = null
  emit('drag-end')
}

function handleDragEnter(event: DragEvent, index: number) {
  currentDropIndex.value = index
  emit('drag-enter', event, index)
}

function handleDrop(event: DragEvent, index: number) {
  currentDropIndex.value = null
  emit('drop', event, index)
}

function handleVisibilityChange(item: TableColumn, visible: boolean) {
  emit('visibility-change', item, visible)
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
