<template>
  <button
    type="button"
    class="column-list-item w-full text-left"
    :class="{
      'cursor-grab': mode === 'active',
      'hover:bg-gray-50': mode === 'available'
    }"
    :draggable="mode === 'active'"
    :aria-label="`${column.name} column`"
    @dragstart="handleDragStart"
    @dragend="$emit('drag-end', $event)"
    @dragenter="handleDragEnter"
    @drop="handleDrop"
    @dragover.prevent
  >
    <div
      class="flex items-center gap-2 p-2 rounded border"
      :class="{
        'border-primary': dropPosition === 'above',
        'border-transparent': dropPosition !== 'above'
      }"
    >
      <div class="flex-1">
        <div class="flex items-center gap-2">
          <span class="font-medium text-sm">{{ column.name }}</span>
          <span class="text-xs text-gray-500">({{ column.type }})</span>
        </div>
        <div class="text-xs text-gray-500">{{ column.description }}</div>
      </div>
      <div class="flex items-center gap-1">
        <button
          v-if="mode === 'available'"
          type="button"
          class="p-1 text-gray-500 hover:text-primary-focus"
          :aria-label="`Add ${column.name} column`"
          @click.stop="$emit('add', column)"
        >
          <PlusIcon class="w-4 h-4" />
        </button>
        <button
          v-if="mode === 'active'"
          type="button"
          class="p-1 text-gray-500 hover:text-primary-focus"
          :aria-label="`Remove ${column.name} column`"
          @click.stop="$emit('remove', column)"
        >
          <MinusIcon class="w-4 h-4" />
        </button>
        <button
          v-if="mode === 'active' && column.removable"
          type="button"
          class="p-1 text-gray-500 hover:text-primary-focus"
          :aria-label="`${column.visible ? 'Hide' : 'Show'} ${column.name} column`"
          @click.stop="$emit('visibility-change', column, !column.visible)"
        >
          <EyeIcon v-if="column.visible" class="w-4 h-4" />
          <EyeSlashIcon v-else class="w-4 h-4" />
        </button>
      </div>
    </div>
  </button>
</template>

<script setup lang="ts">
import { PlusIcon, MinusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/vue/24/outline'
import type { TableColumn } from '~/composables/core/types'

interface Props {
  column: TableColumn
  mode: 'available' | 'active'
  dropPosition?: 'above' | 'below' | null
}

const props = withDefaults(defineProps<Props>(), {
  dropPosition: null
})

const emit = defineEmits<{
  add: [column: TableColumn]
  remove: [column: TableColumn]
  'drag-start': [event: DragEvent, column: TableColumn]
  'drag-end': [event: DragEvent]
  'drag-enter': [event: DragEvent]
  drop: [event: DragEvent]
  'visibility-change': [column: TableColumn, visible: boolean]
}>()

function handleDragStart(event: DragEvent): void {
  const target = event.target as HTMLElement
  if (event.dataTransfer && target) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', props.column.id)
    target.classList.add('opacity-50')
  }
  emit('drag-start', event, props.column)
}

function handleDragEnter(event: DragEvent): void {
  event.preventDefault()
  emit('drag-enter', event)
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  const target = event.target as HTMLElement
  if (target) {
    target.classList.remove('opacity-50')
  }
  emit('drop', event)
}
</script>

<style scoped>
.column-list-item {
  position: relative;
  display: block;
  width: 100%;
}

.column-list-item:not(:last-child) {
  margin-bottom: 0.5rem;
}

.column-list-item.dragging {
  opacity: 0.5;
}

.column-list-item button {
  opacity: 0.7;
  transition: opacity 0.2s;
}

.column-list-item button:hover {
  opacity: 1;
}

/* Focus styles */
.column-list-item:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}

.column-list-item button:focus {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
</style>
