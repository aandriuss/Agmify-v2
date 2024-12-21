<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles column management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

// Types
import type { TableColumn } from '~/composables/core/types'

const props = defineProps<{
  currentTableColumns: TableColumn[]
  currentDetailColumns: TableColumn[]
  parameterColumns: TableColumn[]
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'update:merged-table-columns': [columns: TableColumn[]]
  'update:merged-detail-columns': [columns: TableColumn[]]
  'column-visibility-change': []
  'column-order-change': []
  error: [error: Error]
}>()

// Process columns
const mergedTableColumns = computed(() => {
  return props.currentTableColumns.map((col) => ({
    ...col,
    visible: true
  }))
})

const mergedDetailColumns = computed(() => {
  return props.currentDetailColumns.map((col) => ({
    ...col,
    visible: true
  }))
})

// Watch for changes and emit updates
watch(
  mergedTableColumns,
  (columns) => {
    emit('update:merged-table-columns', columns)
  },
  { immediate: true }
)

watch(
  mergedDetailColumns,
  (columns) => {
    emit('update:merged-detail-columns', columns)
  },
  { immediate: true }
)

// Column management
function handleColumnVisibilityChange() {
  emit('column-visibility-change')
}

function handleColumnOrderChange() {
  emit('column-order-change')
}

// Error handling
function handleError(err: Error) {
  debug.error(DebugCategories.ERROR, 'Column management error:', err)
  emit('error', err)
}

// Expose functions
defineExpose({
  handleColumnVisibilityChange,
  handleColumnOrderChange,
  handleError
})
</script>
