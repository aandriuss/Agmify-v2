<template>
  <div
    class="flex items-center justify-between p-1 hover:bg-gray-50 rounded text-sm group"
    :class="{ 'border-t-2 border-blue-500': isDraggingOver }"
    :draggable="true"
    @dragstart="$emit('dragstart', $event)"
    @dragenter.prevent="$emit('dragenter', $event)"
    @dragleave.prevent="$emit('dragleave', $event)"
    @dragover.prevent
    @drop.prevent="$emit('drop', $event)"
  >
    <div class="flex items-center gap-0">
      <i v-if="mode === 'active'" class="pi pi-bars text-gray-400 cursor-move" />
      <ParameterBadge v-if="column" :parameter="column" />
    </div>

    <div class="flex items-center gap-0">
      <!-- Add arrow button for available items -->
      <Button
        v-if="mode === 'available'"
        icon="pi pi-arrow-right"
        text
        severity="primary"
        size="small"
        class="opacity-0 group-hover:opacity-100 transition-opacity"
        @click="$emit('add', column)"
      />

      <!-- Remove button and checkbox for active items -->
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
          v-model="isVisible"
          :binary="true"
          @change="$emit('visibility-change', column, isVisible)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ParameterBadge from '../../../../../parameters/components/ParameterBadge.vue'

import type { ColumnDef, ParameterDefinition } from '../../../composables/types'

interface Props {
  column: ColumnDef | ParameterDefinition
  mode: 'active' | 'available'
  isDraggingOver?: boolean
}

const props = defineProps<Props>()

const isVisible = computed({
  get: () => props.column?.visible ?? true,
  set: (value) => emit('visibility-change', props.column, value)
})

const emit = defineEmits<{
  remove: [column: ColumnDef]
  add: [item: ParameterDefinition]
  'visibility-change': [column: ColumnDef, visible: boolean]
  dragstart: [event: DragEvent]
  dragenter: [event: DragEvent]
  dragleave: [event: DragEvent]
  drop: [event: DragEvent]
}>()
</script>
