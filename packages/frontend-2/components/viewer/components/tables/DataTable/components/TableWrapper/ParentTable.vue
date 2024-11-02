<template>
  <DataTable
    v-model:expanded-rows="expandedRows"
    :value="data"
    resizable-columns
    reorderable-columns
    striped-rows
    class="p-datatable-sm shadow-sm"
    :paginator="false"
    :rows="10"
    expand-mode="row"
    @column-resize="onColumnResize"
    @column-reorder="onColumnReorder"
  >
    <template #expansion="slotProps">
      <ChildTable
        :data="slotProps.data.details"
        :columns="detailColumns"
        @column-resize="onColumnResize"
        @column-reorder="onColumnReorder"
      />
    </template>

    <Column :expander="true" style="width: 3rem" />
    <template v-for="col in visibleColumns" :key="col.field">
      <Column
        :field="col.field"
        :header="col.header"
        :header-component="col.headerComponent"
        :data-field="col.field"
        :style="{ width: col.width ? `${col.width}px` : 'auto' }"
        sortable
      />
    </template>
  </DataTable>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import ChildTable from './ChildTable.vue'

interface ColumnDef {
  field: string
  header: string
  visible: boolean
  removable?: boolean
  width?: number
  order: number
  headerComponent?: any
}

interface Props {
  data: any[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'column-resize', event: any): void
  (e: 'column-reorder', event: any): void
  (e: 'update:expanded-rows', rows: any[]): void
}>()

const expandedRows = ref([])

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
.p-datatable {
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.p-datatable :deep(.p-datatable-header) {
  background-color: var(--surface-section);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.p-datatable :deep(.p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}
</style>
