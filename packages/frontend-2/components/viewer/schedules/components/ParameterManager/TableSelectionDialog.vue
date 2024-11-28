<template>
  <LayoutDialog
    :open="true"
    max-width="md"
    title="Add Parameter to Tables"
    :buttons="dialogButtons"
    @update:open="$emit('close')"
  >
    <div class="p-4">
      <div v-if="parameter" class="mb-4">
        <div class="font-medium">Parameter: {{ parameter.name }}</div>
        <div class="text-sm text-gray-500">
          Group: {{ parameter.group || 'Custom' }}
        </div>
      </div>

      <div class="space-y-4">
        <div v-for="table in tables" :key="table.id" class="flex items-center gap-2">
          <input
            :id="table.id"
            v-model="selectedTableIds"
            type="checkbox"
            :value="table.id"
            class="h-4 w-4"
          />
          <label :for="table.id" class="select-none">{{ table.name }}</label>
        </div>
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LayoutDialogButton } from '@speckle/ui-components'
import type { CustomParameter } from '~/types'

interface Table {
  id: string
  name: string
}

const props = defineProps<{
  parameter: CustomParameter | null
  tables: Table[]
  modelValue: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'save'): void
  (e: 'close'): void
}>()

const selectedTableIds = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

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
