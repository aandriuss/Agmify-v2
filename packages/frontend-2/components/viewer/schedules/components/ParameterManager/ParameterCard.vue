<template>
  <div class="border rounded p-4 space-y-3">
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="font-medium">{{ parameter.name }}</div>
        <div class="text-sm text-gray-500">({{ parameter.group || 'Custom' }})</div>
      </div>
      <div class="flex gap-2">
        <FormButton
          text
          size="sm"
          color="primary"
          @click="$emit('add-to-tables', parameter)"
        >
          Add to Tables
        </FormButton>
        <FormButton text size="sm" color="primary" @click="$emit('edit', parameter)">
          Edit
        </FormButton>
        <FormButton text size="sm" color="danger" @click="$emit('delete', parameter)">
          Delete
        </FormButton>
      </div>
    </div>

    <div class="text-sm space-y-2">
      <div>
        <span class="font-medium">Type:</span>
        {{ parameter.type }}
      </div>
      <div v-if="parameter.type === 'fixed'">
        <span class="font-medium">Value:</span>
        {{ parameter.value }}
      </div>
      <div v-else>
        <span class="font-medium">Equation:</span>
        {{ parameter.equation }}
      </div>
      <div v-if="parameter.type === 'equation'" class="text-gray-500">
        Current value: {{ currentValue }}
      </div>
      <div class="text-gray-500">
        <span class="font-medium">Used in Tables:</span>
        {{ usedInTables }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CustomParameter } from '../../types'

defineProps<{
  parameter: CustomParameter
  currentValue: string
  usedInTables: string
}>()

defineEmits<{
  (e: 'edit', parameter: CustomParameter): void
  (e: 'delete', parameter: CustomParameter): void
  (e: 'add-to-tables', parameter: CustomParameter): void
}>()
</script>
