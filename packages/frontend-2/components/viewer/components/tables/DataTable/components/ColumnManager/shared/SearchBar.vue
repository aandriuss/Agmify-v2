<template>
  <div class="relative mb-3">
    <i
      class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
    />
    <input
      :value="modelValue"
      type="text"
      placeholder="Search parameters..."
      class="w-full pl-2 pr-2 py-0.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <Button
      v-if="modelValue"
      icon="pi pi-times"
      text
      severity="secondary"
      class="absolute right-2 top-1/2 transform -translate-y-1/2"
      @click="$emit('update:modelValue', '')"
    />
  </div>
</template>

<script setup lang="ts">
import Button from 'primevue/button'
defineProps<{
  modelValue: string
}>()

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
