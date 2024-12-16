<template>
  <button
    type="button"
    class="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm group w-full text-left"
    :class="{ 'opacity-50': isActive }"
    draggable="true"
    @dragstart="$emit('dragstart', $event)"
  >
    <div class="flex items-center gap-2">
      <ParameterBadge :parameter="parameterValue" />

      <span
        v-if="parameterValue.type"
        class="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-700"
      >
        {{ parameterValue.type }}
      </span>

      <Tooltip v-if="parameterValue.description">
        <template #target>
          <InfoIcon
            class="w-4 h-4 text-gray-400 cursor-help"
            :aria-label="parameterValue.description"
          />
        </template>
        <template #content>
          {{ parameterValue.description }}
        </template>
      </Tooltip>
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-if="parameterValue.removable !== false"
        :icon="isActive ? 'pi pi-check' : 'pi pi-plus'"
        :disabled="isActive"
        text
        severity="secondary"
        size="small"
        @click.stop="$emit('add', parameter)"
      />
      <Checkbox
        v-if="showVisibility"
        v-model="parameterVisible"
        :binary="true"
        class="ml-2"
        @click.stop
      />
    </div>
  </button>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Tooltip from 'primevue/tooltip'

import type { Parameter, ColumnDef } from '~/composables/core/types'
import { columnDefToParameter } from '~/composables/core/parameters'
import ParameterBadge from './ParameterBadge.vue'

const props = defineProps<{
  parameter: Parameter | ColumnDef
  isActive: boolean
  showVisibility?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', parameter: Parameter | ColumnDef): void
  (e: 'remove', parameter: Parameter | ColumnDef): void
  (e: 'update:visible', value: boolean): void
  (e: 'dragstart', event: DragEvent): void
}>()

const parameterValue = computed<Parameter>(() => {
  if ('kind' in props.parameter) {
    return props.parameter
  }
  return columnDefToParameter(props.parameter)
})

// Handle visibility checkbox
const parameterVisible = computed({
  get: () => {
    if ('kind' in props.parameter) {
      return props.parameter.visible ?? true
    }
    return props.parameter.visible
  },
  set: (value: boolean) => {
    emit('update:visible', value)
  }
})

// Watch for external visibility changes
watch(
  () => parameterValue.value.visible,
  (newValue) => {
    if (newValue !== undefined && newValue !== parameterVisible.value) {
      parameterVisible.value = newValue
    }
  }
)
</script>

<style scoped>
.pi {
  font-size: 1rem;
}

.pi-info-circle:hover {
  color: var(--primary-color);
}
</style>
