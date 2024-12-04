<template>
  <LayoutDialog
    :open="true"
    max-width="md"
    :hide-closer="false"
    mode="out-in"
    :title="isEditing ? 'Edit Parameter' : 'Add Parameter'"
    :buttons="dialogButtons"
    @update:open="$emit('close')"
  >
    <div class="p-4 space-y-4">
      <div>
        <label for="param-name" class="block text-sm font-medium mb-1">
          Parameter Name
        </label>
        <input
          id="param-name"
          :value="modelValue.name"
          type="text"
          class="w-full px-3 py-2 border rounded"
          placeholder="Enter parameter name"
          @input="updateField('name', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="modelValue.errors?.name" class="text-sm text-red-500 mt-1">
          {{ modelValue.errors.name }}
        </div>
      </div>

      <div>
        <label for="param-group" class="block text-sm font-medium mb-1">Group</label>
        <input
          id="param-group"
          :value="modelValue.group"
          type="text"
          class="w-full px-3 py-2 border rounded"
          placeholder="Enter group name (default: Custom)"
          @input="updateField('group', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <div>
        <label for="param-type" class="block text-sm font-medium mb-1">Type</label>
        <select
          id="param-type"
          :value="modelValue.type"
          class="w-full px-3 py-2 border rounded"
          @change="
            updateField(
              'type',
              ($event.target as HTMLSelectElement).value as 'fixed' | 'equation'
            )
          "
        >
          <option value="fixed">Fixed Value</option>
          <option value="equation">Equation</option>
        </select>
      </div>

      <div v-if="modelValue.type === 'fixed'">
        <label for="param-value" class="block text-sm font-medium mb-1">Value</label>
        <input
          id="param-value"
          :value="modelValue.value"
          type="text"
          class="w-full px-3 py-2 border rounded"
          placeholder="Enter fixed value"
          @input="updateField('value', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="modelValue.errors?.value" class="text-sm text-red-500 mt-1">
          {{ modelValue.errors.value }}
        </div>
      </div>

      <div v-else>
        <label for="param-equation" class="block text-sm font-medium mb-1">
          Equation
        </label>
        <textarea
          id="param-equation"
          :value="modelValue.equation"
          class="w-full px-3 py-2 border rounded"
          rows="3"
          placeholder="Enter equation (e.g., param1 + param2 * 2)"
          @input="updateField('equation', ($event.target as HTMLTextAreaElement).value)"
        ></textarea>
        <div class="text-sm text-gray-500 mt-1">
          Available parameters: {{ availableParameters }}
        </div>
        <div class="text-sm text-gray-500 mt-1">
          Available functions: abs, ceil, floor, round, max, min, pow, sqrt
        </div>
        <div v-if="modelValue.errors?.equation" class="text-sm text-red-500 mt-1">
          {{ modelValue.errors.equation }}
        </div>
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutDialogButton } from '@speckle/ui-components'
import type { ParameterFormData } from '~/composables/core/types'

const props = defineProps<{
  modelValue: ParameterFormData
  availableParameters: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: ParameterFormData): void
  (e: 'save'): void
  (e: 'close'): void
}>()

const updateField = (field: keyof ParameterFormData, value: string) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: value
  })
}

const isEditing = computed(() => !!props.modelValue.id)

const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: 'Save',
    props: { color: 'primary' },
    onClick: () => emit('save')
  },
  {
    text: 'Cancel',
    props: { color: 'outline' },
    onClick: () => emit('close')
  }
])
</script>
