<template>
  <button
    type="button"
    class="column-list-item group"
    :class="{
      'is-dragging': isDragging,
      'drop-target': isDropTarget,
      [`drop-position-${dropPosition}`]: isDropTarget && dropPosition
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragenter.prevent="handleDragEnter"
    @dragover.prevent
    @drop.prevent="handleDrop"
  >
    <!-- Main content -->
    <div class="flex items-center justify-between w-full p-1">
      <!-- Left side with drag handle and parameter info -->
      <div class="flex items-center gap-1">
        <i
          v-if="mode === 'active'"
          class="pi pi-bars text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <ParameterBadge
          v-if="column"
          :parameter="isParameter(column) ? column : columnDefToParameter(column)"
        />
      </div>

      <!-- Right side with action buttons -->
      <div class="flex items-center gap-1">
        <!-- Add button for available items -->
        <Button
          v-if="mode === 'available'"
          icon="pi pi-arrow-right"
          text
          severity="primary"
          size="small"
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @click="handleAdd"
        />

        <!-- Remove button and visibility toggle for active items -->
        <template v-if="mode === 'active'">
          <Button
            v-if="isColumnDef(column) && column.removable"
            icon="pi pi-arrow-left"
            text
            severity="danger"
            size="small"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click="handleRemove"
          />
          <Checkbox
            v-model="isVisible"
            :binary="true"
            @change="handleVisibilityChange"
          />
        </template>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ParameterBadge from '~/components/parameters/ParameterBadge.vue'
import type { TableColumn, AvailableParameter } from '~/composables/core/types'
import {
  columnDefToParameter,
  isParameter
} from '~/composables/parameters/useParameterConversion'

interface Props {
  column: TableColumn | AvailableParameter
  mode: 'active' | 'available'
  index: number
  isDragging?: boolean
  isDropTarget?: boolean
  dropPosition?: 'above' | 'below' | null
}

const props = withDefaults(defineProps<Props>(), {
  isDragging: false,
  isDropTarget: false,
  dropPosition: null
})

const emit = defineEmits<{
  add: [column: AvailableParameter]
  remove: [column: TableColumn]
  'visibility-change': [column: TableColumn, visible: boolean]
  'drag-start': [
    event: DragEvent,
    column: TableColumn | AvailableParameter,
    index: number
  ]
  'drag-end': [event: DragEvent]
  'drag-enter': [event: DragEvent, index: number]
  drop: [event: DragEvent, index: number]
}>()

function isColumnDef(value: TableColumn | AvailableParameter): value is TableColumn {
  return 'visible' in value && 'removable' in value
}

// Local state
const isVisible = computed({
  get: () => (isColumnDef(props.column) ? props.column.visible : true),
  set: (value: boolean) => {
    if (isColumnDef(props.column)) {
      emit('visibility-change', props.column, value)
    }
  }
})

// Event handlers
function handleAdd() {
  if (isParameter(props.column)) {
    emit('add', props.column)
  } else {
    emit('add', columnDefToParameter(props.column))
  }
}

function handleRemove() {
  if (isColumnDef(props.column)) {
    emit('remove', props.column)
  }
}

function handleDragStart(event: DragEvent) {
  if (!event.dataTransfer) return

  // Set drag data
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', '') // Required for Firefox

  // Emit drag start event
  emit('drag-start', event, props.column, props.index)
}

function handleDragEnd(event: DragEvent) {
  emit('drag-end', event)
}

function handleDragEnter(event: DragEvent) {
  emit('drag-enter', event, props.index)
}

function handleDrop(event: DragEvent) {
  emit('drop', event, props.index)
}

function handleVisibilityChange() {
  if (isColumnDef(props.column)) {
    emit('visibility-change', props.column, isVisible.value)
  }
}
</script>

<style scoped>
.column-list-item {
  @apply relative flex items-center rounded transition-colors duration-200 cursor-grab active:cursor-grabbing;
  @apply w-full text-left;

  user-select: none;
}

.column-list-item:hover:not(.is-dragging) {
  @apply bg-gray-50;
}

.is-dragging {
  @apply opacity-50 cursor-grabbing;
}

.drop-target {
  @apply bg-blue-50;
}

.drop-position-below::after {
  content: '';
  @apply absolute left-0 right-0 h-0.5 bg-primary;
}

.drop-position-above::before {
  @apply -top-px;
}
</style>
