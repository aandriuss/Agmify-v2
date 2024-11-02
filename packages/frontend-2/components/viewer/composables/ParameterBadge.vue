<template>
  <div
    class="px-2 py-0.5 rounded text-sm inline-flex items-center"
    :class="[
      parameter.isFixed
        ? 'bg-blue-100 text-blue-800 border border-blue-200'
        : 'bg-green-100 text-green-800 border border-green-200'
    ]"
  >
    {{ parameter.header }}
    <span v-if="parameter.category" class="ml-1 text-xs opacity-75">
      ({{ parameter.category }})
    </span>
  </div>
</template>

<script setup lang="ts">
interface Parameter {
  header: string
  category?: string
  isFixed?: boolean
}

defineProps<{
  parameter: Parameter
}>()
</script>

<style scoped>
.parameter-badge {
  white-space: nowrap;
}
</style>
