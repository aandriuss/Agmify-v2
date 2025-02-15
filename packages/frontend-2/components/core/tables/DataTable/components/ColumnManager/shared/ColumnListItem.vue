<template>
  <button
    type="button"
    class="column-list-item group"
    :class="{
      'is-dragging': isDragging,
      'drop-target': mode === 'active' && isDropTarget,
      [`drop-position-${dropPosition}`]:
        mode === 'active' && isDropTarget && dropPosition
    }"
    :draggable="mode === 'active' || mode === 'available'"
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
        <Bars3Icon
          v-if="mode === 'active'"
          class="w-4 h-4 text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <div class="flex flex-col">
          <span class="text-sm font-medium">{{ getItemName }}</span>
          <span class="text-xs text-gray-500">{{ getItemType }}</span>
        </div>
      </div>

      <!-- Right side with action buttons -->
      <div class="flex items-center gap-1">
        <!-- Add arrow for available items -->
        <div
          v-if="mode === 'available'"
          class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
        >
          <ArrowRightIcon
            class="w-4 h-4 text-primary cursor-pointer"
            @click="handleAdd"
          />
        </div>

        <!-- Remove X and visibility toggle for active items -->
        <template v-if="mode === 'active'">
          <div class="flex items-center gap-2">
            <!-- Eye icon toggle -->
            <component
              :is="isVisible ? EyeIcon : EyeSlashIcon"
              :class="{
                'w-4 h-4 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity':
                  isVisible,
                'w-4 h-4 cursor-pointer text-gray-400': !isVisible
              }"
              @click="handleVisibilityChange"
            />

            <!-- Remove X button -->
            <XMarkIcon
              v-if="isColumn(column) && column.removable"
              class="w-4 h-4 text-danger cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              @click="handleRemove"
            />
          </div>
        </template>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  ArrowRightIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon
} from '@heroicons/vue/24/solid'
import type {
  TableColumn,
  AvailableBimParameter,
  AvailableUserParameter
} from '~/composables/core/types'
import {
  isAvailableBimParameter,
  isAvailableUserParameter
} from '~/composables/core/types'

type AvailableParameter = AvailableBimParameter | AvailableUserParameter

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

// Type Guards
function isColumn(value: TableColumn | AvailableParameter): value is TableColumn {
  return 'parameter' in value
}

function isParameter(
  value: TableColumn | AvailableParameter
): value is AvailableParameter {
  return (
    value &&
    typeof value === 'object' &&
    'kind' in value &&
    (value.kind === 'bim' || value.kind === 'user') &&
    'id' in value &&
    'name' in value &&
    'type' in value &&
    'value' in value &&
    'group' in value
  )
}

// Computed Properties
const getItemName = computed(() => {
  const param = isColumn(props.column) ? props.column.parameter : props.column
  // Use displayName from metadata if available, otherwise use clean name
  const displayName = param.metadata?.displayName
  return typeof displayName === 'string' ? displayName : param.name
})

const getItemType = computed(() => {
  if (isColumn(props.column)) {
    return props.column.parameter.kind === 'bim' ? 'BIM Parameter' : 'User Parameter'
  }
  if (isAvailableBimParameter(props.column)) {
    return `BIM - ${props.column.type}`
  }
  if (isAvailableUserParameter(props.column)) {
    return `User - ${props.column.type}`
  }
  return 'Unknown'
})

// Local state
const isVisible = computed({
  get: () => (isColumn(props.column) ? props.column.visible : true),
  set: (value: boolean) => {
    if (isColumn(props.column)) {
      emit('visibility-change', props.column, value)
    }
  }
})

// Event handlers
function handleAdd() {
  if (isParameter(props.column)) {
    // eslint-disable-next-line no-console
    console.log('Adding parameter:', {
      parameter: props.column,
      kind: props.column.kind,
      isUser: props.column.kind === 'user'
    })
    emit('add', props.column)
  }
}

function handleRemove() {
  if (isColumn(props.column)) {
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
  if (isColumn(props.column)) {
    emit('visibility-change', props.column, !isVisible.value)
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
  @apply absolute left-0 right-0 -bottom-px h-0.5 bg-primary;
}

.drop-position-above::before {
  content: '';
  @apply absolute left-0 right-0 -top-px h-0.5 bg-primary;
}
</style>
