<template>
  <div class="border-b">
    <div class="flex gap-4">
      <button
        :class="[
          'px-4 py-2 text-sm transition-colors',
          modelValue === 'parent'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        ]"
        @click="$emit('update:modelValue', 'parent')"
      >
        Parent Columns
      </button>
      <button
        :class="[
          'px-4 py-2 text-sm transition-colors',
          modelValue === 'child'
            ? 'border-b-2 border-blue-500 text-blue-600'
            : 'text-gray-600 hover:text-gray-900'
        ]"
        @click="$emit('update:modelValue', 'child')"
      >
        Child Columns
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: 'parent' | 'child'
}>()

defineEmits<{
  'update:modelValue': [value: 'parent' | 'child']
}>()
</script>
