<template>
  <div class="prime-local">
    <FormButton color="outline" class="mb-3" @click="openDialog">
      Manage Columns
    </FormButton>

    <span v-if="isSaving" class="text-sm text-gray-500">Saving changes...</span>

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
        <div class="flex gap-4 h-[400px] lists-container">
          <!-- Left Panel: Available Parameters -->
          <div class="flex-1 border rounded flex flex-col">
            <div class="p-2 border-b bg-gray-50 space-y-2">
              <!-- Header with Toggle Button -->
              <div class="flex justify-between items-center">
                <h3 class="font-medium text-sm">Available Parameterszz</h3>
                <FormButton
                  text
                  size="sm"
                  color="subtle"
                  :icon-right="showFilterOptions ? ChevronUpIcon : ChevronDownIcon"
                  @click="showFilterOptions = !showFilterOptions"
                >
                  Filter Options
                </FormButton>
              </div>

              <!-- Search Bar and Filter Controls (Toggled) -->
              <div v-show="showFilterOptions" class="space-y-3">
                <!-- Search Bar -->
                <div class="relative">
                  <i
                    class="pi pi-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  />
                  <input
                    v-model="searchTerm"
                    type="text"
                    placeholder="Search parameters..."
                    class="w-full pl-9 pr-4 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    v-if="searchTerm"
                    icon="pi pi-times"
                    text
                    severity="secondary"
                    class="absolute right-2 top-1/2 transform -translate-y-1/2"
                    @click="searchTerm = ''"
                  />
                </div>

                <!-- Filter Controls -->
                <div class="flex gap-2">
                  <Menu as="div" class="relative">
                    <MenuButton
                      class="px-2 py-1 text-sm border rounded-md hover:bg-gray-50 flex items-center gap-1"
                    >
                      <i class="pi pi-sliders-h" />
                      Filters
                    </MenuButton>

                    <MenuItems
                      class="absolute left-0 mt-1 w-56 bg-white border rounded-md shadow-lg p-1 z-10"
                    >
                      <MenuItem v-slot="{ active }">
                        <button
                          :class="[
                            'w-full text-left px-2 py-1 text-sm rounded',
                            active ? 'bg-gray-100' : ''
                          ]"
                          @click="toggleGrouping"
                        >
                          <div class="flex items-center gap-2">
                            <Checkbox :model-value="isGrouped" :binary="true" />
                            Group by Category
                          </div>
                        </button>
                      </MenuItem>

                      <div class="h-px bg-gray-200 my-1" />

                      <div class="px-2 py-1">
                        <div class="text-xs font-medium text-gray-500 mb-1">
                          Sort by
                        </div>
                        <RadioGroup v-model="sortBy" class="space-y-1">
                          <RadioGroupOption
                            v-for="option in sortOptions"
                            :key="option.value"
                            v-slot="{ checked }"
                            :value="option.value"
                          >
                            <button
                              class="w-full flex items-center gap-2 px-2 py-1 text-sm rounded hover:bg-gray-50"
                              :class="{ 'bg-blue-50': checked }"
                            >
                              <div
                                class="w-3 h-3 rounded-full border"
                                :class="{ 'bg-blue-500 border-blue-500': checked }"
                              />
                              {{ option.label }}
                            </button>
                          </RadioGroupOption>
                        </RadioGroup>
                      </div>
                    </MenuItems>
                  </Menu>

                  <button
                    v-if="hasFilters"
                    class="px-2 py-1 text-sm text-gray-500 hover:text-gray-700"
                    @click="clearFilters"
                  >
                    <i class="pi pi-times mr-1" />
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <!-- Parameters List -->
            <div class="flex-1 overflow-y-auto p-1 space-y-1">
              <!-- When Grouped -->
              <template v-if="isGrouped">
                <div
                  v-for="group in groupedParameters"
                  :key="group.category"
                  class="space-y-1"
                >
                  <div class="px-2 py-1 bg-gray-50 text-sm font-medium rounded">
                    {{ group.category }}
                  </div>
                  <div class="space-y-1 pl-2">
                    <template v-for="param in group.parameters" :key="param.field">
                      <ParameterItem
                        :parameter="param"
                        :is-active="isParameterActive(param)"
                        draggable="true"
                        @add="addColumn"
                        @remove="removeColumn"
                        @dragstart="dragStart($event, param, 'available')"
                      />
                    </template>
                  </div>
                </div>
              </template>

              <!-- When Not Grouped -->
              <template v-else>
                <ParameterItem
                  v-for="param in filteredParameters"
                  :key="param.field"
                  :parameter="param"
                  :is-active="isParameterActive(param)"
                  draggable="true"
                  @add="addColumn"
                  @remove="removeColumn"
                  @dragstart="dragStart($event, param, 'available')"
                />
              </template>
            </div>
          </div>

          <!-- Right Panel: Active Columns -->
          <div
            class="flex-1 border rounded flex flex-col"
            @dragover.prevent="handleDragOver"
            @drop="handleDropToActive"
          >
            <div class="p-2 border-b bg-gray-50">
              <h3 class="font-medium text-sm">Active Columns</h3>
            </div>

            <div class="flex-1 overflow-y-auto p-1 space-y-1">
              <div
                v-for="(column, index) in currentTempColumns"
                :key="column.field"
                class="flex items-center justify-between p-2 hover:bg-gray-50 rounded text-sm"
                draggable="true"
                :class="{ 'border-t-2 border-blue-500': dragOverIndex === index }"
                @dragstart="dragStart($event, column, 'active', index)"
                @dragenter.prevent="handleDragEnter($event, index)"
              >
                <div class="flex items-center gap-2">
                  <i class="pi pi-bars text-gray-400 cursor-move" />
                  <ParameterBadge :parameter="column" />
                </div>

                <div class="flex items-center gap-2">
                  <Button
                    v-if="column.removable"
                    icon="pi pi-times"
                    text
                    severity="danger"
                    size="small"
                    @click="removeColumn(column)"
                  />
                  <Checkbox
                    v-model="column.visible"
                    :input-id="column.field"
                    :binary="true"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutDialog>

    <!-- Data Tables -->
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
      @column-reorder="handleColumnReorder"
    >
      <template #expansion="slotProps">
        <div class="p-1">
          <DataTable
            :value="slotProps.data.details"
            resizable-columns
            reorderable-columns
            striped-rows
            class="nested-table"
            @column-resize="onColumnResize"
            @column-reorder="handleColumnReorder"
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import {
  Menu as HMenu,
  MenuButton,
  MenuItems,
  MenuItem,
  RadioGroup,
  RadioGroupOption
} from '@headlessui/vue'

import type { ColumnDef } from '~/composables/core/types'

import ParameterItem from '~/components/viewer/components/parameters/components/ParameterItem.vue'
import ParameterBadge from '~/components/viewer/components/parameters/components/ParameterBadge.vue'

import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'

const showFilterOptions = ref(false)

const emit = defineEmits<{
  'update:expandedRows': [value: any[]]
  'update:columns': [columns: any[]]
  'update:detail-columns': [columns: any[]]
  'update:both-columns': [updates: { parentColumns: any[]; childColumns: any[] }]
  'column-reorder': [event: any]
}>()

// Separate states for parent and child columns
const tempParentColumns = ref<ColumnDef[]>([])
const tempChildColumns = ref<ColumnDef[]>([])
const localParentColumns = ref<ColumnDef[]>([])
const localChildColumns = ref<ColumnDef[]>([])

// Computed properties for current tab
const currentTempColumns = computed(() => {
  return activeTab.value === 'parent' ? tempParentColumns.value : tempChildColumns.value
})

const currentAvailableParameters = computed(() => {
  return activeTab.value === 'parent'
    ? props.availableParentParameters
    : props.availableChildParameters
})

const getIsFixed = (field: string): boolean => {
  // Check in the current available parameters list
  const param = currentAvailableParameters.value.find((p) => p.field === field)
  return param?.isFixed ?? false
}
// Parameter utility functions
const parameterUtils = {
  search(parameters: ParameterDefinition[], searchTerm: string) {
    const normalizedSearch = searchTerm.toLowerCase().trim()
    if (!normalizedSearch) return parameters

    return parameters.filter(
      (param) =>
        param.header.toLowerCase().includes(normalizedSearch) ||
        param.field.toLowerCase().includes(normalizedSearch) ||
        param.category?.toLowerCase().includes(normalizedSearch) ||
        param.type?.toLowerCase().includes(normalizedSearch)
    )
  },

  sort(parameters: ParameterDefinition[], sortBy: string) {
    return [...parameters].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.header.localeCompare(b.header)
        case 'category':
          return (a.category || 'Other').localeCompare(b.category || 'Other')
        case 'type':
          return (a.type || '').localeCompare(b.type || '')
        case 'fixed':
          if (a.isFixed === b.isFixed) {
            return a.header.localeCompare(b.header)
          }
          return a.isFixed ? -1 : 1
        default:
          return 0
      }
    })
  },

  groupByCategory(parameters: ParameterDefinition[]) {
    const groups: Record<string, ParameterDefinition[]> = {}

    parameters.forEach((param) => {
      const category = param.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(param)
    })

    return Object.entries(groups)
      .map(([category, parameters]) => ({
        category,
        parameters: parameters.sort((a, b) => a.header.localeCompare(b.header))
      }))
      .sort((a, b) => a.category.localeCompare(b.category))
  }
}

interface ParameterDefinition {
  field: string
  header: string
  type?: string
  description?: string
  category?: string
  isFixed?: boolean
  order?: number
  visible?: boolean
}

const props = defineProps<{
  tableId: string
  data: any[]
  columns: ColumnDef[]
  detailColumns: ColumnDef[]
  availableParentParameters: ParameterDefinition[]
  availableChildParameters: ParameterDefinition[]
}>()

// State
const dialogOpen = ref(false)
const expandedRows = ref([])
const activeTab = ref('parent')
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type' | 'fixed'>('category')

// Sort options
const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'type', label: 'Type' },
  { value: 'fixed', label: 'Fixed First' }
]

// Computed properties using the utility functions
const filteredParameters = computed(() => {
  let result =
    activeTab.value === 'parent'
      ? props.availableParentParameters
      : props.availableChildParameters

  if (searchTerm.value) {
    result = parameterUtils.search(result, searchTerm.value)
  }

  return parameterUtils.sort(result, sortBy.value)
})

const groupedParameters = computed(() => {
  return parameterUtils.groupByCategory(filteredParameters.value)
})

const hasFilters = computed(() => {
  return searchTerm.value || sortBy.value !== 'category' || !isGrouped.value
})

// Utility functions
const toggleGrouping = () => {
  isGrouped.value = !isGrouped.value
}

const clearFilters = () => {
  searchTerm.value = ''
  sortBy.value = 'category'
  isGrouped.value = true
}

const isParameterActive = (param: ParameterDefinition) => {
  return currentTempColumns.value.some((col) => col.field === param.field)
}

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
    console.log('Applying changes:', {
      parentColumns: tempParentColumns.value,
      childColumns: tempChildColumns.value
    })

    // Update local state
    localParentColumns.value = JSON.parse(JSON.stringify(tempParentColumns.value))
    localChildColumns.value = JSON.parse(JSON.stringify(tempChildColumns.value))

    // Emit both column updates together
    emit('update:both-columns', {
      parentColumns: tempParentColumns.value,
      childColumns: tempChildColumns.value
    })

    // Close the dialog
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

const addColumn = (param: ParameterDefinition) => {
  const columns = activeTab.value === 'parent' ? tempParentColumns : tempChildColumns

  if (!columns.value.find((col) => col.field === param.field)) {
    columns.value.push({
      field: param.field,
      header: param.header,
      visible: true,
      removable: true,
      order: columns.value.length,
      isFixed: param.isFixed // Preserve the isFixed property
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

const isSaving = ref(false)

const onColumnReorder = (event: any) => {
  try {
    isSaving.value = true
    // Get all visible columns from the DataTable
    const headers = event.target.getElementsByTagName('th')
    const columns = Array.from(headers)
      .filter((header) => header.dataset.field) // Filter out expander column
      .map((header, index) => {
        const field = header.dataset.field
        // Find the original column config to preserve properties
        const originalColumn =
          localParentColumns.value.find((col) => col.field === field) ||
          localChildColumns.value.find((col) => col.field === field)

        return {
          ...originalColumn,
          field,
          order: index,
          visible: true
        }
      })

    // Determine if this is parent or child table
    const isChildTable = event.target.closest('.nested-table')

    console.log('Reordered columns:', {
      isChildTable,
      columns
    })

    if (isChildTable) {
      emit('update:detailColumns', columns)
    } else {
      emit('update:columns', columns)
    }
  } catch (error) {
    console.error('Error handling column reorder:', error)
  } finally {
    isSaving.value = false
  }
}

const handleDragStart = (event) => {
  console.log('Column drag started:', event)
}

const handleDragEnd = (event) => {
  console.log('Column drag ended:', event)
}

const handleColumnDrop = (event) => {
  const dragIndex = draggedItem.value.index
  const dropIndex = dragOverIndex.value
  if (dragIndex === undefined || dropIndex === undefined) return

  const columns =
    activeTab.value === 'parent' ? tempParentColumns.value : tempChildColumns.value

  // Move the dragged column
  const [movedColumn] = columns.splice(dragIndex, 1)
  columns.splice(dropIndex, 0, movedColumn)

  // Update each column’s order
  columns.forEach((col, index) => (col.order = index))

  // Emit the update event to `Schedules.vue`
  const eventToEmit =
    activeTab.value === 'parent' ? 'reorder-columns' : 'reorder-detail-columns'
  emit(eventToEmit, columns)
}

const handleColumnReorder = (event) => {
  const dataTable = event?.target?.closest('.p-datatable')
  if (!dataTable) return

  const isNestedTable = dataTable.classList.contains('nested-table')
  const headers = Array.from(dataTable.querySelectorAll('th[data-field]'))

  // Get the source columns (same as in manage columns)
  const sourceColumns = isNestedTable ? tempChildColumns : tempParentColumns

  // Map headers to columns in their new order
  const reorderedColumns = headers
    .map((header, index) => {
      const field = header.getAttribute('data-field')
      const existingColumn = sourceColumns.value.find((col) => col.field === field)
      if (!existingColumn) return null

      return {
        ...existingColumn,
        order: index,
        visible: existingColumn.visible ?? true,
        header: existingColumn.header,
        field: existingColumn.field
      }
    })
    .filter(Boolean)

  // Update local state
  if (isNestedTable) {
    tempChildColumns.value = reorderedColumns
    localChildColumns.value = reorderedColumns
    emit('update:detailColumns', reorderedColumns)
  } else {
    tempParentColumns.value = reorderedColumns
    localParentColumns.value = reorderedColumns
    emit('update:columns', reorderedColumns)
  }
}

// Debug logging
watch(
  () => props.detailColumns,
  (newCols) => {},
  { deep: true }
)

watch(
  () => props.data,
  (newData) => {
    // Log sample items for each category
    const categories = [...new Set(newData?.map((item) => item.category))]
    categories.forEach((category) => {
      const example = newData.find((item) => item.category === category)
      console.log(`Category ${category} sample:`, {
        mainFields: example ? Object.keys(example) : [],
        detailFields: example?.details?.[0] ? Object.keys(example.details[0]) : [],
        sampleItem: example
      })
    })
  },
  { immediate: true }
)

watch(
  () => props.availableParentParameters,
  (params) => {
    console.log(
      'Available parent parameters:',
      params?.map((p) => ({
        field: p.field,
        isFixed: p.isFixed,
        category: p.category
      }))
    )
  },
  { immediate: true, deep: true }
)

watch(
  () => props.availableChildParameters,
  (params) => {
    console.log(
      'Available child parameters:',
      params?.map((p) => ({
        field: p.field,
        isFixed: p.isFixed,
        category: p.category
      }))
    )
  },
  { immediate: true, deep: true }
)
</script>

<style>
@import '../../../assets/prime-vue.css';
</style>

<style scoped>
.prime-local {
  --primary-color: #3b82f6;
  --surface-ground: #f8f9fa;
  --surface-section: #fff;
  --surface-card: #fff;
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
  height: 3rem;
}

.prime-local :deep(.p-datatable .p-datatable-thead > tr > th) {
  background-color: var(--surface-section);
  color: var(--text-color);
  font-weight: 600;
  padding: 0.2rem;
  border-bottom: 1px solid var(--surface-border);
  height: 3rem;
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
  height: rem;
  border-radius: 6px;
  color: #6b7280;
}

:deep(.p-dialog-header-close:hover) {
  background-color: #f3f4f6;
  color: #374151;
}

span[class*='bg-'] {
  transition: opacity 0.15s ease-in-out;
}

.hover-bg-gray-50:hover span[class*='bg-'] {
  opacity: 0.9;
}

.lists-container {
  align-items: stretch;
}
</style>
