<template>
  <DataTable
    :expanded-rows="modelValue"
    :value="data"
    resizable-columns
    reorderable-columns
    striped-rows
    class="p-datatable-sm shadow-sm"
    :paginator="false"
    :rows="10"
    expand-mode="row"
    @update:expanded-rows="$emit('update:modelValue', $event)"
    @column-resize="$emit('column-resize', $event)"
    @column-reorder="$emit('column-reorder', $event)"
  >
    <template #expansion="slotProps">
      <div class="p-1">
        <DataTable
          :value="slotProps.data.details"
          resizable-columns
          reorderable-columns
          striped-rows
          class="nested-table"
          @column-resize="$emit('column-resize', $event)"
          @column-reorder="$emit('column-reorder', $event)"
        >
          <Column :expander="true" style="width: 3rem" />
          <Column
            v-for="col in visibleChildColumns"
            :key="col.field"
            :field="col.field"
            :header="col.header"
            :data-field="col.field"
            :style="{ width: col.width ? `${col.width}px` : 'auto' }"
            sortable
          />
        </DataTable>
      </div>
    </template>

    <Column :expander="true" style="width: 3rem" />
    <Column
      v-for="col in visibleParentColumns"
      :key="col.field"
      :field="col.field"
      :header="col.header"
      :header-component="col.headerComponent"
      :data-field="col.field"
      sortable
    />
  </DataTable>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import type { ColumnDef } from '../../composables/types'

const props = defineProps<{
  modelValue: any[] // Changed from expandedRows to modelValue
  data: any[]
  parentColumns: ColumnDef[]
  childColumns: ColumnDef[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any[]] // Changed from update:expandedRows
  'column-resize': [event: any]
  'column-reorder': [event: any]
}>()

const visibleParentColumns = computed(() =>
  props.parentColumns.filter((col) => col.visible)
)

const visibleChildColumns = computed(() =>
  props.childColumns.filter((col) => col.visible)
)
</script>

<style scoped>
.nested-table {
  margin: 0;
}

:deep(.p-datatable-expanded-row > td) {
  padding: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: #f8f9fa;
}
</style>
