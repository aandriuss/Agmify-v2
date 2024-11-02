<template>
  <div class="p-1">
    <DataTable
      :value="data"
      resizable-columns
      reorderable-columns
      striped-rows
      class="nested-table"
      @column-resize="onColumnResize"
      @column-reorder="onColumnReorder"
    >
      <template v-for="col in visibleColumns" :key="col.field">
        <Column
          :field="col.field"
          :header="col.header"
          :data-field="col.field"
          :style="{ width: col.width ? `${col.width}px` : 'auto' }"
          sortable
        />
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

interface ColumnDef {
  field: string
  header: string
  visible: boolean
  removable?: boolean
  width?: number
  order: number
}

interface Props {
  data: any[]
  columns: ColumnDef[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'column-resize', event: any): void
  (e: 'column-reorder', event: any): void
}>()

const visibleColumns = computed(() => {
  return props.columns.filter((col) => col.visible).sort((a, b) => a.order - b.order)
})

const onColumnResize = (event: any) => {
  emit('column-resize', event)
}

const onColumnReorder = (event: any) => {
  emit('column-reorder', event)
}
</script>

<style scoped>
.nested-table {
  margin: 0 !important;
}

.nested-table :deep(.p-datatable-thead > tr > th) {
  background-color: #f8f9fa;
}

/* Add styles for resize handle */
.nested-table :deep(.p-column-resizer) {
  width: 0;
  background-color: transparent;
}

.nested-table :deep(.p-column-resizer:hover) {
  background-color: #e9ecef;
}
</style>
