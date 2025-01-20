<template>
  <div class="flex flex-col h-full">
    <!-- List -->
    <div class="flex-1 overflow-y-auto">
      <div class="p-2 space-y-1">
        <template v-if="isGrouped">
          <div v-for="group in items" :key="group.group">
            <button
              type="button"
              class="flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900 mb-1"
              @click="toggleGroup(group.group)"
            >
              <ChevronRightIcon v-if="!isGroupExpanded(group.group)" class="w-4 h-4" />
              <ChevronDownIcon v-else class="w-4 h-4" />
              {{ group.group }}
              <span class="text-xs text-gray-500">({{ group.items.length }})</span>
            </button>
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
        <template v-else>
          <ColumnListItem
            v-for="(item, index) in items[0].items"
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
import { ref, onMounted } from 'vue'
import type {
  TableColumn,
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types'
import ColumnListItem from './ColumnListItem.vue'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'

type AvailableParameter = AvailableBimParameter | AvailableUserParameter

type GroupedItems = Array<{
  group: string
  items: Array<TableColumn | AvailableParameter>
}>

interface Props {
  items: GroupedItems
  mode: 'active' | 'available'
  isGrouped: boolean
  dropPosition?: 'above' | 'below' | null
}

const props = withDefaults(defineProps<Props>(), {
  dropPosition: null
})

const emit = defineEmits<{
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

const currentDropIndex = ref<number | null>(null)
const expandedGroups = ref<Set<string>>(new Set())

// Group expansion functions
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
onMounted(() => {
  props.items.forEach((group) => {
    expandedGroups.value.add(group.group)
  })
})

// Helper Functions
function getItemId(item: AvailableParameter | TableColumn): string {
  return 'field' in item ? item.field : item.id
}

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
