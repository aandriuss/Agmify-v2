<template>
  <div
    class="parameter-badge flex items-center gap-1"
    :class="{
      'fixed-parameter': parameter.isFixed,
      'custom-parameter': !parameter.isFixed
    }"
  >
    <span class="parameter-name">{{ parameter.header }}</span>
    <span v-if="showDetails" class="parameter-details text-xs text-gray-500">
      {{ parameter.field }}
      <span v-if="parameter.category" class="parameter-category">
        {{ parameter.category }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Parameter } from '~/composables/core/types'

interface Props {
  parameter: Parameter
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: false
})
</script>

<style scoped>
.parameter-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.875rem;
}

.fixed-parameter {
  background-color: #eff6ff; /* blue-50 */
  border: 1px solid #bfdbfe; /* blue-200 */
  color: #2563eb; /* blue-600 */
}

.custom-parameter {
  background-color: #f3f4f6; /* gray-100 */
  border: 1px solid #e5e7eb; /* gray-200 */
  color: #374151; /* gray-700 */
}

.parameter-details {
  opacity: 0.7;
}

.parameter-category {
  font-size: 0.75rem;
  padding: 0 4px;
  background-color: rgb(0 0 0 / 5%);
  border-radius: 3px;
  margin-left: 4px;
}
</style>
