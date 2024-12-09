<template>
  <div class="parameter-group-list">
    <div v-if="groups.size">
      <h3 class="text-sm font-medium mb-2">Parameter Groups</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="[kind, rows] in Array.from(groups.entries())"
          :key="kind"
          class="parameter-group"
        >
          <h4 class="font-medium mb-2">{{ kind }}</h4>
          <div class="space-y-2">
            <button
              v-for="row in rows"
              :key="row.id"
              type="button"
              class="parameter-row"
              @click="$emit('row-click', row)"
              @keydown.enter="$emit('row-click', row)"
            >
              <span class="parameter-name">{{ row.name }}</span>
              <span v-if="row.sourceValue" class="parameter-source">
                (BIM Parameter)
              </span>
              <span v-else-if="row.equation" class="parameter-source">
                (Custom Parameter)
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ScheduleRow } from '../types'

interface Props {
  groups: Map<string, ScheduleRow[]>
}

interface Emits {
  (e: 'row-click', row: ScheduleRow): void
}

defineProps<Props>()
defineEmits<Emits>()
</script>

<style scoped>
.parameter-group-list {
  @apply mt-4;
}

.parameter-group {
  @apply p-4 border rounded-lg bg-white;
}

.parameter-row {
  @apply w-full text-left text-sm text-gray-600 cursor-pointer hover:text-primary-600 flex items-center gap-2 p-1 rounded transition-colors;
}

.parameter-row:focus {
  @apply outline-none ring-2 ring-primary-500 ring-offset-1;
}

.parameter-name {
  @apply flex-1;
}

.parameter-source {
  @apply text-xs text-gray-500;
}
</style>
