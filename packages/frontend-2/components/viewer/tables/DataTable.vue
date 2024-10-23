<template>
  <div class="prime-local">
    <FormButton color="outline" class="mb-3" @click="dialogOpen = true">
      Manage Columns
    </FormButton>

    <LayoutDialog
      v-model:open="dialogOpen"
      :max-width="'sm'"
      :hide-closer="false"
      :prevent-close-on-click-outside="false"
      title="Column Visibility"
      :buttons="{
        0: {
          text: 'Close',
          props: { color: 'outline', link: false }
        }
      }"
    >
      <div class="flex flex-col space-y-4">
        <div
          v-for="col in columns"
          :key="col.field"
          class="flex items-center space-x-2"
        >
          <Checkbox v-model="col.visible" :input-id="col.field" :binary="true" />
          <label :for="col.field">{{ col.header }}</label>
        </div>
      </div>
    </LayoutDialog>

    <DataTable
      v-model:expandedRows="expandedRows"
      :value="data"
      resizable-columns
      reorderable-columns
      striped-rows
      class="p-datatable-sm shadow-sm"
      :paginator="false"
      :rows="10"
      expand-mode="row"
    >
      <template #expansion="slotProps">
        <div class="p-1">
          <DataTable
            :value="slotProps.data.details"
            resizable-columns
            reorderable-columns
            striped-rows
            class="nested-table"
          >
            <Column
              v-for="col in detailColumns"
              :key="col.field"
              :field="col.field"
              :header="col.header"
              sortable
            />
          </DataTable>
        </div>
      </template>

      <Column :expander="true" style="width: 3rem" />
      <Column
        v-for="col in visibleColumns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        sortable
      />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
// import type { Column as ColumnType, DetailColumn } from '~/composables/useDataTable'
import { useDataTable } from '../composables/useDataTables'
import { LayoutDialog, FormButton } from '@speckle/ui-components'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'

interface Props {
  data: any[]
  columns: ColumnType[]
  detailColumns: DetailColumn[]
}

const props = defineProps<Props>()

const { dialogOpen, expandedRows, columns, detailColumns, visibleColumns } =
  useDataTable(props.columns, props.detailColumns)
</script>

<style>
@import '../../../assets/prime-vue.css';
</style>

<style scoped>
.prime-local {
  --primary-color: #3b82f6;
  --surface-ground: #f8f9fa;
  --surface-section: #ffffff;
  --surface-card: #ffffff;
  --surface-border: #dfe7ef;
  --text-color: #495057;
  --text-color-secondary: #6c757d;
}

.prime-local :deep(.p-datatable) {
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.prime-local :deep(.p-datatable .p-datatable-header) {
  background-color: var(--surface-section);
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.prime-local :deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.prime-local :deep(.p-datatable .p-datatable-tbody > tr) {
  color: var(--text-color);
  transition: background-color 0.2s;
}

.prime-local :deep(.p-datatable .p-datatable-tbody > tr > td) {
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
}

.prime-local :deep(.p-datatable .p-datatable-tbody > tr:hover) {
  background-color: #f0f7ff;
}

/* Paginator styling */
.prime-local :deep(.p-paginator) {
  background-color: var(--surface-section);
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  padding: 0.5rem;
}

.prime-local :deep(.p-paginator .p-paginator-current) {
  color: var(--text-color-secondary);
}

.prime-local :deep(.p-paginator .p-paginator-pages .p-paginator-page.p-highlight) {
  background-color: var(--primary-color);
  color: white;
}

/* Sortable column styling */
.prime-local :deep(.p-sortable-column:hover) {
  background-color: #f0f7ff;
}

.prime-local :deep(.p-sortable-column.p-highlight) {
  background-color: #e8f0fe;
}

/* Stripe row styling */
.prime-local
  :deep(.p-datatable.p-datatable-striped .p-datatable-tbody > tr:nth-child(even)) {
  background-color: #fafbfc;
}

/* Style nested table */
:deep(.p-datatable-expanded-row > td) {
  padding: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable) {
  margin: 0 !important;
}

:deep(.p-datatable-expanded-row .p-datatable .p-datatable-thead > tr > th) {
  background-color: #f8f9fa;
}

/* Add styles for resize handle */
:deep(.p-datatable-expanded-row .p-datatable .p-column-resizer) {
  width: 0;
  background-color: transparent;
}

:deep(.p-datatable-expanded-row .p-datatable .p-column-resizer:hover) {
  background-color: #e9ecef;
}

/* Sort icon styling - updated selectors (doesn't work) */
:deep(.p-sortable-column .pi-sort-alt) {
  opacity: 0;
}

:deep(.p-sortable-column:hover .pi-sort-alt) {
  opacity: 0.5;
}

:deep(.p-sortable-column.p-highlight .pi-sort-amount-up-alt),
:deep(.p-sortable-column.p-highlight .pi-sort-amount-down) {
  opacity: 1;
}

/* Dialog styling to match viewer theme */
:deep(div.p-dialog.p-component.viewer-dialog) {
  display: flex !important;
  flex-direction: column !important;
  pointer-events: auto !important;
  margin: 0 !important;
  position: fixed !important;
  background-color: white !important;
  width: 300px !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
  border: 1px solid #e5e7eb !important;
}

/* Apply to mask specifically */
:deep(.p-dialog-mask) {
  display: flex !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100% !important;
  height: 100% !important;
  background: rgba(0, 0, 0, 0.4) !important;
  z-index: 1000 !important;
}

:deep(.p-dialog-header) {
  background: white !important;
  padding: 1rem !important;
}

:deep(.p-dialog-content) {
  background: white !important;
  padding: 1rem !important;
}

.field-checkbox {
  display: flex;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.field-checkbox:last-child {
  border-bottom: none;
}

:deep(.p-checkbox) {
  margin-right: 0.75rem;
}

/* Optional: Add transition for smooth open/close */
:deep(.p-dialog-enter-active) {
  transition: all 0.3s ease-out;
}

:deep(.p-dialog-leave-active) {
  transition: all 0.2s ease-in;
}

:deep(.p-dialog-enter-from),
:deep(.p-dialog-leave-to) {
  opacity: 0;
  transform: translateY(-20px);
}

/* Optional: Add styles for the settings button */
:deep(.p-button) {
  padding: 0.5rem;
  background-color: #fff;
  border: 1px solid #e5e7eb;
  color: #374151;
  border-radius: 6px;
}

:deep(.p-button:hover) {
  background-color: #f3f4f6;
  border-color: #d1d5db;
}

:deep(.p-dialog-header-close) {
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  color: #6b7280;
}

:deep(.p-dialog-header-close:hover) {
  background-color: #f3f4f6;
  color: #374151;
}
</style>
