<template>
  <div
    class="parameter-badge flex items-center gap-1"
    :class="{
      'bim-parameter': parameter.kind === 'bim',
      'user-parameter': parameter.kind === 'user'
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
import type { Parameter } from '~/composables/core/types/parameters/parameter-types'

interface Props {
  parameter: Parameter
  showDetails?: boolean
}

defineProps<Props>()
</script>

<style scoped>
.parameter-badge {
  padding: 2px 8px;
}

.bim-parameter {
  background-color: #eff6ff; /* blue-50 */
}

.user-parameter {
  background-color: #f3f4f6; /* gray-100 */
}

.parameter-details {
  opacity: 0.7;
}

.parameter-category {
  font-size: 0.75rem;
}
</style>
