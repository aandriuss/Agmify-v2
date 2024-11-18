<template>
  <div></div>
  <!-- This component doesn't render anything, it just handles column management -->
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useMergedColumns } from '../composables/useMergedColumns'
import { useColumnVisibility } from '../composables/useColumnVisibility'
import { debug, DebugCategories } from '../utils/debug'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'

const props = defineProps<{
  currentTableColumns: ColumnDef[]
  currentDetailColumns: ColumnDef[]
  parameterColumns: ColumnDef[]
  isInitialized: boolean
}>()

const emit = defineEmits<{
  'update:mergedTableColumns': [value: ColumnDef[]]
  'update:mergedDetailColumns': [value: ColumnDef[]]
  'column-visibility-change': [column: ColumnDef, visible: boolean]
  error: [error: Error]
}>()

// Initialize merged columns
const { mergedTableColumns, mergedDetailColumns } = useMergedColumns({
  currentTableColumns: computed(() => props.currentTableColumns),
  currentDetailColumns: computed(() => props.currentDetailColumns),
  parameterColumns: computed(() => props.parameterColumns),
  isInitialized: computed(() => props.isInitialized),
  // Since this component doesn't handle category filtering, we don't need to pass these
  selectedParentCategories: computed(() => []),
  selectedChildCategories: computed(() => [])
})

// Initialize column visibility
const { handleColumnVisibilityChange } = useColumnVisibility({
  updateParameterVisibility: (paramId: string, visible: boolean) => {
    const column = props.parameterColumns.find(
      (col) => 'parameterRef' in col && col.parameterRef === paramId
    )
    if (column) {
      emit('column-visibility-change', column, visible)
    }
  }
})

// Watch for column changes
watch(
  [mergedTableColumns, mergedDetailColumns],
  ([newTableCols, newDetailCols]) => {
    debug.log(DebugCategories.COLUMNS, 'Column state updated', {
      mergedTableColumns: newTableCols?.length || 0,
      mergedDetailColumns: newDetailCols?.length || 0,
      timestamp: new Date().toISOString()
    })

    emit('update:mergedTableColumns', newTableCols || [])
    emit('update:mergedDetailColumns', newDetailCols || [])
  },
  { immediate: true }
)

// Expose necessary functions and state
defineExpose({
  mergedTableColumns,
  mergedDetailColumns,
  handleColumnVisibilityChange
})
</script>
