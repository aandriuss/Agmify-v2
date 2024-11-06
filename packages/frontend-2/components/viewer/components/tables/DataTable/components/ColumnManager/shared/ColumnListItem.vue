<template>
  <div
    class="column-list-item group"
    :class="{
      'is-dragging': isDragging,
      'is-dragging-over': isDraggingOver
    }"
    draggable="true"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragenter.prevent="handleDragEnter"
    @dragleave.prevent="handleDragLeave"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
  >
    <div class="flex items-center justify-between w-full p-1">
      <!-- Left side -->
      <div class="flex items-center gap-1">
        <i
          v-if="mode === 'active'"
          class="pi pi-bars text-gray-400 cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
        />
        <ParameterBadge v-if="column" :parameter="column" />
      </div>

      <!-- Right side -->
      <div class="flex items-center gap-1">
        <!-- Add button for available items -->
        <Button
          v-if="mode === 'available'"
          icon="pi pi-arrow-right"
          text
          severity="primary"
          size="small"
          class="opacity-0 group-hover:opacity-100 transition-opacity"
          @click="$emit('add', column)"
        />

        <!-- Remove button and visibility toggle for active items -->
        <template v-if="mode === 'active'">
          <Button
            v-if="column?.removable"
            icon="pi pi-arrow-left"
            text
            severity="danger"
            size="small"
            class="opacity-0 group-hover:opacity-100 transition-opacity"
            @click="$emit('remove', column)"
          />
          <Checkbox
            v-model="isVisibleLocal"
            :binary="true"
            @change="handleVisibilityChange"
          />
        </template>
      </div>
    </div>

    <!-- Drop indicator -->
    <div
      v-if="isDraggingOver"
      class="absolute left-0 right-0 h-0.5 bg-blue-500"
      :class="{
        '-top-px': dropPosition === 'above',
        '-bottom-px': dropPosition === 'below'
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ParameterBadge from '~/components/viewer/components/parameters/components/ParameterBadge.vue'
import type { ColumnDef, ParameterDefinition } from '../../../composables/types'

interface Props {
  column: ColumnDef | ParameterDefinition
  mode: 'active' | 'available'
  index: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  add: [column: ParameterDefinition]
  remove: [column: ColumnDef]
  'visibility-change': [column: ColumnDef, visible: boolean]
  'drag-start': [
    event: DragEvent,
    column: ColumnDef | ParameterDefinition,
    index: number
  ]
  'drag-end': [event: DragEvent]
  'drag-enter': [event: DragEvent, index: number, position: 'above' | 'below']
  'drag-leave': [event: DragEvent]
  drop: [event: DragEvent, index: number, position: 'above' | 'below']
}>()

// Local state
const isDragging = ref(false)
const isDraggingOver = ref(false)
const dropPosition = ref<'above' | 'below'>('below')

// Computed
const isVisibleLocal = computed({
  get: () => (props.column as ColumnDef)?.visible ?? true,
  set: (value: boolean) => {
    emit('visibility-change', props.column as ColumnDef, value)
  }
})

function handleDragStart(event: DragEvent) {
  if (!event.dataTransfer) return

  isDragging.value = true

  // Set drag data
  const dragData = {
    column: props.column,
    sourceIndex: props.index,
    sourceMode: props.mode
  }

  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('application/json', JSON.stringify(dragData))

  // Prevent text selection
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = '0.4'
  }

  emit('drag-start', event, props.column, props.index)
}

function handleDragEnd(event: DragEvent) {
  isDragging.value = false
  if (event.target instanceof HTMLElement) {
    event.target.style.opacity = ''
  }
  emit('drag-end', event)
}

function handleDragEnter(event: DragEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropPosition.value = mouseY < threshold ? 'above' : 'below'
  isDraggingOver.value = true

  emit('drag-enter', event, props.index, dropPosition.value)
}

function handleDragLeave(event: DragEvent) {
  if (!event.currentTarget?.contains(event.relatedTarget as Node)) {
    isDraggingOver.value = false
    emit('drag-leave', event)
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropPosition.value = mouseY < threshold ? 'above' : 'below'
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDraggingOver.value = false

  try {
    const dragData = JSON.parse(event.dataTransfer?.getData('application/json') || '{}')
    emit('drop', event, props.index, dropPosition.value)
  } catch (error) {
    console.error('Error processing drop:', error)
  }
}

function handleVisibilityChange() {
  emit('visibility-change', props.column as ColumnDef, isVisibleLocal.value)
}
</script>

<style scoped>
.column-list-item {
  @apply relative flex items-center rounded transition-colors duration-200 cursor-grab active:cursor-grabbing;
}

.column-list-item:hover:not(.is-dragging) {
  @apply bg-gray-50;
}

.is-dragging {
  @apply opacity-50 cursor-grabbing;
}

.is-dragging-over {
  @apply bg-blue-50;
}

[draggable] {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
</style>
