<template>
  <div class="prime-local">
    <FormButton color="outline" class="mb-3" @click="openDialog">
      Manage Columns
    </FormButton>

    <LayoutDialog
      v-model:open="dialogOpen"
      :max-width="'lg'"
      :hide-closer="false"
      :prevent-close-on-click-outside="false"
      title="Column Manager"
      :buttons="{
        0: {
          text: 'Apply',
          props: { color: 'default', link: false },
          onClick: applyChanges
        },
        1: {
          text: 'Cancel',
          props: { color: 'outline', link: false },
          onClick: cancelChanges
        }
      }"
    >
      <div class="flex flex-col gap-4">
        <!-- Tabs -->
        <div class="border-b">
          <div class="flex gap-4">
            <button
              :class="[
                'px-4 py-2',
                activeTab === 'parent' ? 'border-b-2 border-blue-500' : ''
              ]"
              @click="activeTab = 'parent'"
            >
              Parent Columns
            </button>
            <button
              :class="[
                'px-4 py-2',
                activeTab === 'child' ? 'border-b-2 border-blue-500' : ''
              ]"
              @click="activeTab = 'child'"
            >
              Child Columns
            </button>
          </div>
        </div>

        <!-- Column Management Area -->
        <div class="flex gap-4 h-[400px]">
          <!-- Left Panel: Available Parameters -->
          <div
            class="flex-1 border rounded"
            @dragover.prevent
            @drop="handleDropToAvailable"
          >
            <div class="p-1 border-b bg-gray-50">
              <h3 class="font-medium text-sm">Available Parameters</h3>
            </div>
            <div class="p-1 space-y-1 overflow-y-auto max-h-[calc(400px-3rem)]">
              <div
                v-for="param in currentAvailableParameters"
                :key="param.field"
                class="flex items-center justify-between p-0.5 hover:bg-gray-50 rounded cursor-move text-sm"
                draggable="true"
                @dragstart="dragStart($event, param, 'available')"
              >
                <span>{{ param.header }}</span>
                <FormButton
                  color="outline"
                  size="xs"
                  class="!h-4 !w-4 !p-0 !min-w-0 text-xs flex items-center justify-center"
                  @click="addColumn(param)"
                >
                  →
                </FormButton>
              </div>
            </div>
          </div>

          <!-- Right Panel: Active Columns -->
          <div
            class="flex-1 border rounded"
            @dragover.prevent="handleDragOver($event)"
            @drop="handleDropToActive($event)"
          >
            <div class="p-1 border-b bg-gray-50">
              <h3 class="font-medium text-sm">Active Columns</h3>
            </div>
            <div class="p-1 space-y-1 overflow-y-auto max-h-[calc(400px-3rem)]">
              <div
                v-for="(col, index) in currentTempColumns"
                :key="col.field"
                class="flex items-center justify-between p-0.5 hover:bg-gray-50 rounded text-sm"
                draggable="true"
                :class="{ 'border-t-2 border-blue-500': dragOverIndex === index }"
                @dragstart="dragStart($event, col, 'active', index)"
                @dragenter.prevent="handleDragEnter($event, index)"
              >
                <div class="flex items-center gap-1">
                  <i class="pi pi-bars cursor-move text-gray-400 text-xs"></i>
                  <span>{{ col.header }}</span>
                </div>
                <div class="flex items-center gap-1">
                  <FormButton
                    v-if="col.removable"
                    color="danger"
                    size="xs"
                    class="!h-4 !w-4 !p-0 !min-w-0 text-xs flex items-center justify-center"
                    @click="removeColumn(col)"
                  >
                    ←
                  </FormButton>
                  <Checkbox
                    v-model="col.visible"
                    :input-id="col.field"
                    :binary="true"
                  />
                </div>
              </div>
            </div>
          </div>
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
      @column-resize="onColumnResize"
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
              v-for="col in visibleChildColumns"
              :key="col.field"
              :field="col.field"
              :header="col.header"
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
        sortable
      />
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { LayoutDialog, FormButton } from '@speckle/ui-components'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'

interface ColumnDef {
  field: string
  header: string
  visible: boolean
  removable?: boolean
  width?: number
  order: number
}

const props = defineProps<{
  tableId: string
  data: any[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
}>()

const emit = defineEmits(['update:columns', 'update:detailColumns'])

const dialogOpen = ref(false)
const expandedRows = ref([])
const activeTab = ref('parent')

// Separate states for parent and child columns
const tempParentColumns = ref<ColumnDef[]>([])
const tempChildColumns = ref<ColumnDef[]>([])
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])

// Available parameters for both levels
const availableParentParameters = ref([
  { field: 'area', header: 'Area (m²)' },
  { field: 'volume', header: 'Volume (m³)' },
  { field: 'cost', header: 'Cost ($)' },
  { field: 'weight', header: 'Weight (kg)' }
])

const availableChildParameters = ref([
  { field: 'description', header: 'Description' },
  { field: 'assignee', header: 'Assignee' },
  { field: 'priority', header: 'Priority' },
  { field: 'status', header: 'Status' },
  { field: 'dueDate', header: 'Due Date' },
  { field: 'progress', header: 'Progress' }
])

// Computed properties for current tab
const currentTempColumns = computed(() => {
  return activeTab.value === 'parent' ? tempParentColumns.value : tempChildColumns.value
})

const currentAvailableParameters = computed(() => {
  return activeTab.value === 'parent'
    ? availableParentParameters.value
    : availableChildParameters.value
})

const visibleParentColumns = computed(() => {
  return localParentColumns.value.filter((col) => col.visible)
})

const visibleChildColumns = computed(() => {
  return localChildColumns.value.filter((col) => col.visible)
})

// Initialize columns when component mounts
if (props.columns) {
  localParentColumns.value = JSON.parse(JSON.stringify(props.columns))
  tempParentColumns.value = JSON.parse(JSON.stringify(props.columns))
}

if (props.detailColumns) {
  localChildColumns.value = JSON.parse(JSON.stringify(props.detailColumns))
  tempChildColumns.value = JSON.parse(JSON.stringify(props.detailColumns))
}

// Dialog management
const openDialog = () => {
  tempParentColumns.value = JSON.parse(JSON.stringify(localParentColumns.value))
  tempChildColumns.value = JSON.parse(JSON.stringify(localChildColumns.value))
  dialogOpen.value = true
}

const applyChanges = () => {
  try {
    localParentColumns.value = JSON.parse(JSON.stringify(tempParentColumns.value))
    localChildColumns.value = JSON.parse(JSON.stringify(tempChildColumns.value))

    // Emit both updates together as a single batch
    emit('update:both-columns', {
      parentColumns: localParentColumns.value,
      childColumns: localChildColumns.value
    })

    dialogOpen.value = false
  } catch (error) {
    console.error('Error applying changes:', error)
  }
}

const cancelChanges = () => {
  tempParentColumns.value = JSON.parse(JSON.stringify(localParentColumns.value))
  tempChildColumns.value = JSON.parse(JSON.stringify(localChildColumns.value))
  resetDragState()
  dialogOpen.value = false
}

// Drag and drop state
const dragOverIndex = ref(-1)
const draggedItem = ref<{ item: ColumnDef; source: string; index?: number } | null>(
  null
)

const resetDragState = () => {
  draggedItem.value = null
  dragOverIndex.value = -1
}

// Drag and drop handlers
const dragStart = (
  event: DragEvent,
  item: ColumnDef,
  source: string,
  index?: number
) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('text/plain', JSON.stringify(item))
    draggedItem.value = { item, source, index }
  }
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
}

const handleDragEnter = (event: DragEvent, index: number) => {
  if (draggedItem.value?.source === 'active') {
    dragOverIndex.value = index
  }
}

const handleDropToAvailable = (event: DragEvent) => {
  if (draggedItem.value?.source === 'active') {
    const item = draggedItem.value.item
    if (item.removable) {
      removeColumn(item)
    }
  }
  resetDragState()
}

const handleDropToActive = (event: DragEvent) => {
  const dropIndex = dragOverIndex.value

  if (draggedItem.value) {
    const { item, source, index: dragIndex } = draggedItem.value
    const columns = activeTab.value === 'parent' ? tempParentColumns : tempChildColumns

    if (source === 'available') {
      if (dropIndex >= 0) {
        columns.value.splice(dropIndex, 0, {
          field: item.field,
          header: item.header,
          visible: true,
          removable: true,
          order: dropIndex
        })
      } else {
        addColumn(item)
      }
    } else if (source === 'active' && typeof dragIndex === 'number' && dropIndex >= 0) {
      const [movedColumn] = columns.value.splice(dragIndex, 1)
      columns.value.splice(dropIndex, 0, movedColumn)

      // Update order after move
      columns.value.forEach((col, index) => {
        col.order = index
      })
    }
  }

  resetDragState()
}

const addColumn = (param: ColumnDef) => {
  const columns = activeTab.value === 'parent' ? tempParentColumns : tempChildColumns

  if (!columns.value.find((col) => col.field === param.field)) {
    columns.value.push({
      field: param.field,
      header: param.header,
      visible: true,
      removable: true,
      order: columns.value.length
    })
  }
}

const removeColumn = (column: ColumnDef) => {
  if (column.removable) {
    const columns = activeTab.value === 'parent' ? tempParentColumns : tempChildColumns
    const index = columns.value.findIndex((col) => col.field === column.field)
    if (index !== -1) {
      columns.value.splice(index, 1)
      // Update order after removal
      columns.value.forEach((col, idx) => {
        col.order = idx
      })
    }
  }
}

const onColumnResize = (event: any) => {
  const { element, delta } = event
  const columns = activeTab.value === 'parent' ? tempParentColumns : tempChildColumns
  const column = columns.value.find((col) => col.field === element.dataset.field)
  if (column) {
    column.width = element.offsetWidth
    emit('update:columns', columns.value)
  }
}
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
  width: 0.5rem;
  height: 0.5rem;
}

:deep(.p-checkbox .p-checkbox-box) {
  width: 0.5rem;
  height: 0.5rem;
}

:deep(.p-checkbox-box .p-checkbox-icon) {
  font-size: 0.4rem;
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
