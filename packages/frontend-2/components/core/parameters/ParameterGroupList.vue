<template>
  <div class="parameter-group-list">
    <div v-if="groups.size">
      <h3 class="text-sm font-medium mb-2">Parameter Groups</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="[kind, parameters] in Array.from(groups.entries())"
          :key="kind"
          class="parameter-group"
        >
          <h4 class="font-medium mb-2">{{ kind }}</h4>
          <div class="space-y-2">
            <button
              v-for="param in parameters"
              :key="param.id"
              type="button"
              class="parameter-row"
              @click="$emit('row-click', param)"
              @keydown.enter="$emit('row-click', param)"
            >
              <span class="parameter-name">{{ param.name }}</span>
              <span v-if="isTableBimParameter(param)" class="parameter-source">
                (BIM Parameter)
                <span v-if="param.sourceValue" class="parameter-value">
                  {{ param.sourceValue }}
                </span>
              </span>
              <span v-else-if="isTableUserParameter(param)" class="parameter-source">
                <span v-if="param.equation" class="parameter-equation">
                  ({{ param.equation }})
                </span>
                <span v-else>(Custom Parameter)</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty-state">
      <p class="text-sm text-foreground-2">No parameters available</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TableParameter } from '~/composables/core/types/tables/parameter-table-types'
import {
  isTableBimParameter,
  isTableUserParameter
} from '~/composables/core/types/tables/parameter-table-types'

interface Props {
  groups: Map<string, TableParameter[]>
  isLoading?: boolean
}

interface Emits {
  (e: 'row-click', parameter: TableParameter): void
}

withDefaults(defineProps<Props>(), {
  isLoading: false
})

defineEmits<Emits>()
</script>

<style scoped>
.parameter-group-list {
  @apply mt-4;
}

.parameter-group {
  @apply p-4 border rounded-lg bg-foundation;
}

.parameter-row {
  @apply w-full text-left text-sm text-foreground-2 cursor-pointer 
    hover:text-primary-focus flex items-center gap-2 p-1 rounded transition-colors;
}

.parameter-row:focus {
  @apply outline-none ring-2 ring-primary-focus ring-offset-1;
}

.parameter-name {
  @apply flex-1;
}

.parameter-source {
  @apply text-xs text-foreground-3 flex items-center gap-1;
}

.parameter-value {
  @apply text-xs text-primary font-medium;
}

.parameter-equation {
  @apply text-xs text-foreground-2 font-mono;
}

.empty-state {
  @apply p-4 text-center border rounded-lg bg-foundation;
}
</style>
