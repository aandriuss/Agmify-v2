<template>
  <div v-if="isLoading" class="flex items-center justify-center h-full">
    <div class="text-center">
      <div class="text-lg font-semibold mb-2">Loading schedule data...</div>
      <div class="text-sm text-gray-500">Please wait while we prepare your data</div>
    </div>
  </div>

  <div v-else-if="error" class="flex items-center justify-center h-full">
    <div class="text-center">
      <div class="text-lg font-semibold mb-2 text-red-500">
        {{ error?.message }}
      </div>
      <FormButton
        class="px-4 py-2 bg-blue-500 text-white rounded hover-bg-blue-600"
        @click="$emit('retry')"
      >
        Retry
      </FormButton>
    </div>
  </div>

  <div v-else>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  isLoading: boolean
  error: Error | null
}>()

defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-center {
  justify-content: center;
}

.h-full {
  height: 100%;
}

.text-center {
  text-align: center;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.font-semibold {
  font-weight: 600;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.text-sm {
  font-size: 0.875rem;
  line-height: 1.25rem;
}

.text-gray-500 {
  color: rgb(107 114 128);
}

.text-red-500 {
  color: rgb(239 68 68);
}

.px-4 {
  padding-left: 1rem;
  padding-right: 1rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.bg-blue-500 {
  background-color: rgb(59 130 246);
}

.text-white {
  color: rgb(255 255 255);
}

.rounded {
  border-radius: 0.25rem;
}

.hover-bg-blue-600:hover {
  background-color: rgb(37 99 235);
}
</style>
