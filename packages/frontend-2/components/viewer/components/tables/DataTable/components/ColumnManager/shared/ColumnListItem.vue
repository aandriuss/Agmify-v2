<template>
  <div
    class="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
    :class="{ 'border-t-2 border-blue-500': isDraggingOver }"
    :draggable="true"
    @dragstart="$emit('dragstart', $event)"
    @dragenter.prevent="$emit('dragenter', $event)"
    @dragleave.prevent="$emit('dragleave', $event)"
    @dragover.prevent
    @drop.prevent="$emit('drop', $event)"
  >
    <div class="flex items-center gap-2">
      <i v-if="mode === 'active'" class="pi pi-bars text-gray-400 cursor-move" />
      <ParameterBadge v-if="column" :parameter="column" />
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-if="column?.removable && mode === 'active'"
        icon="pi pi-times"
        text
        severity="danger"
        size="small"
        @click="$emit('remove', column)"
      />
      <Checkbox
        v-model="isVisible"
        :binary="true"
        @change="$emit('visibility-change', column, isVisible)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import ParameterBadge from '../../../../../../components/parameters/ParameterBadge.vue'

import type { ColumnDef } from '../../../composables/types'

interface ItemType {
  field: string
  header: string
  visible?: boolean
  removable?: boolean
  category?: string
}

interface Props {
  column: ColumnDef
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
  'visibility-change': [column: ColumnDef, visible: boolean]
  dragstart: [event: DragEvent]
  dragenter: [event: DragEvent]
  dragleave: [event: DragEvent]
  drop: [event: DragEvent]
}>()
</script>
