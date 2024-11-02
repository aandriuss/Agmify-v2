<template>
  <div
    class="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm group"
    :class="{ 'opacity-50': isActive }"
    draggable="true"
    @dragstart="$emit('dragstart', $event)"
  >
    <div class="flex items-center gap-2">
      <ParameterBadge :parameter="parameter" />

      <span
        v-if="parameter.type"
        class="px-1.5 py-0.5 text-xs rounded bg-gray-100 text-gray-700"
      >
        {{ parameter.type }}
      </span>

      <Tooltip v-if="parameter.description">
        <template #target>
          <InfoIcon
            class="w-4 h-4 text-gray-400 cursor-help"
            :aria-label="parameter.description"
          />
        </template>
        <template #content>
          {{ parameter.description }}
        </template>
      </Tooltip>
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-if="parameter.removable !== false"
        :icon="isActive ? 'pi pi-check' : 'pi pi-plus'"
        :disabled="isActive"
        text
        severity="secondary"
        size="small"
        @click="$emit('add', parameter)"
      />
      <Checkbox
        v-if="showVisibility"
        v-model="parameterVisible"
        :binary="true"
        class="ml-2"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Tooltip from 'primevue/tooltip'

import ParameterBadge from './ParameterBadge.vue'

interface Parameter {
  field: string
  header: string
  type?: string
  description?: string
  category?: string
  isFixed?: boolean
  removable?: boolean
  visible?: boolean
}

const props = defineProps<{
  parameter: Parameter
  isActive: boolean
  showVisibility?: boolean
}>()

const emit = defineEmits<{
  (e: 'add', parameter: Parameter): void
  (e: 'remove', parameter: Parameter): void
  (e: 'update:visible', value: boolean): void
  (e: 'dragstart', event: DragEvent): void
}>()

// Handle visibility checkbox
const parameterVisible = computed({
  get: () => props.parameter.visible ?? true,
  set: (value: boolean) => {
    emit('update:visible', value)
  }
})

// Watch for external visibility changes
watch(
  () => props.parameter.visible,
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
