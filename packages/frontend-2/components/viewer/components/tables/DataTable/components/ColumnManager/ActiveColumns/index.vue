<template>
  <div class="flex-1 border rounded flex flex-col" @dragover.prevent>
    <div class="p-3 border-b bg-gray-50">
      <h3 class="font-medium text-sm">Active Columns</h3>
    </div>

    <ColumnList
      :columns="columns"
      @remove="handleRemove"
      @reorder="handleReorder"
      @visibility-change="handleVisibilityChange"
    />
  </div>
</template>

<script setup lang="ts">
import ColumnList from './ColumnList.vue'
import type { ColumnDef } from '../../../composables/types'

const props = defineProps<{
  columns: ColumnDef[]
}>()

const emit = defineEmits<{
  'update:columns': [columns: ColumnDef[]]
}>()

const handleRemove = (column: ColumnDef) => {
  if (!column.removable) return

  const updatedColumns = props.columns.filter((col) => col.field !== column.field)
  emit('update:columns', updatedColumns)
}

const handleReorder = (fromIndex: number, toIndex: number) => {
  const columns = [...props.columns]
  const [movedColumn] = columns.splice(fromIndex, 1)
  columns.splice(toIndex, 0, movedColumn)

  // Update order property
  columns.forEach((col, index) => {
    col.order = index
  })

  emit('update:columns', columns)
}

const handleVisibilityChange = (column: ColumnDef, visible: boolean) => {
  const updatedColumns = props.columns.map((col) => {
    if (col.field === column.field) {
      return { ...col, visible }
    }
    return col
  })

  emit('update:columns', updatedColumns)
}
</script>
