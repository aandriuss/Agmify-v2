<template>
  <div class="flex-1 overflow-y-auto p-1 space-y-1">
    <div
      v-for="(column, index) in columns"
      :key="column.field"
      class="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
      draggable="true"
      :class="{ 'border-t-2 border-blue-500': dragOverIndex === index }"
      @dragstart="handleDragStart($event, column, index)"
      @dragenter.prevent="handleDragEnter($event, index)"
      @dragover.prevent
      @drop="handleDrop($event, index)"
    >
      <div class="flex items-center gap-2">
        <i class="pi pi-bars text-gray-400 cursor-move" />
        <ParameterBadge :parameter="column" />
      </div>

      <div class="flex items-center gap-2">
        <Button
          v-if="column.removable"
          icon="pi pi-times"
          text
          severity="danger"
          size="small"
          @click="$emit('remove', column)"
        />
        <Checkbox
          v-model="column.visible"
          :input-id="column.field"
          :binary="true"
          @change="handleVisibilityChange(column)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ParameterBadge from '../../../../../../components/parameters/ParameterBadge.vue'
import type { ColumnDef } from '../../../composables/types'

const props = defineProps<{
  columns: ColumnDef[]
}>()

const emit = defineEmits<{
  remove: [column: ColumnDef]
  reorder: [fromIndex: number, toIndex: number]
  'visibility-change': [column: ColumnDef, visible: boolean]
}>()

const dragOverIndex = ref(-1)

const handleDragStart = (event: DragEvent, column: ColumnDef, index: number) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', JSON.stringify({ column, index }))
  }
}

const handleDragEnter = (event: DragEvent, index: number) => {
  dragOverIndex.value = index
}

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault()
  const data = JSON.parse(event.dataTransfer?.getData('text/plain') || '{}')
  const dragIndex = data.index

  if (typeof dragIndex === 'number' && dragIndex !== dropIndex) {
    emit('reorder', dragIndex, dropIndex)
  }

  dragOverIndex.value = -1
}

const handleVisibilityChange = (column: ColumnDef) => {
  emit('visibility-change', column, column.visible)
}
</script>
