<template>
  <LayoutDialog
    :open="open"
    :max-width="'lg'"
    :hide-closer="false"
    mode="out-in"
    :title="tableName"
    @update:open="$emit('update:open', $event)"
  >
    <div class="flex flex-col gap-2">
      <!-- View selector -->
      <TabSelector :model-value="currentView" @update:model-value="handleViewChange" />

      <!-- Lists container -->
      <div class="flex gap-1 h-[400px]">
        <!-- Available Parameters Panel -->
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">Available Parameters</h3>
            <FormButton
              text
              size="sm"
              color="subtle"
              :icon-right="showFilterOptions ? ChevronUpIcon : ChevronDownIcon"
              @click="toggleFilterOptions"
            >
              Filter Options
            </FormButton>
          </div>

          <ColumnList
            :key="`available-${currentView}-${listRefreshKey}`"
            :items="availableParameters"
            mode="available"
            :show-filter-options="showFilterOptions"
            :search-term="searchTerm"
            :is-grouped="isGrouped"
            :sort-by="sortBy"
            :drop-position="dropPosition"
            @update:search-term="handleSearchUpdate"
            @update:is-grouped="handleGroupingUpdate"
            @update:sort-by="handleSortUpdate"
            @add="handleAdd"
            @remove="handleRemove"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @drag-enter="handleDragEnter"
            @drop="handleDrop"
            @visibility-change="handleVisibilityChange"
          />
        </div>

        <!-- Active Columns Panel -->
        <div class="flex-1 border rounded flex flex-col overflow-hidden bg-background">
          <div class="p-1 border-b bg-gray-50 flex items-center justify-between">
            <h3 class="font-medium text-sm">Active Columns</h3>
            <div class="flex items-center gap-1 text-sm">
              <span v-if="activeColumns.length" class="text-gray-500">
                {{ activeColumns.filter((col) => col?.visible).length }}/{{
                  activeColumns.length
                }}
                visible
              </span>
              <Button
                v-if="hasHiddenColumns"
                type="button"
                class="p-1 text-gray-500 hover:text-primary-focus"
                @click="showAllColumns"
              >
                Show All
              </Button>
            </div>
          </div>

          <ColumnList
            :key="`active-${currentView}-${listRefreshKey}`"
            :items="activeColumns"
            mode="active"
            :show-filter-options="false"
            :drop-position="dropPosition"
            @add="handleAdd"
            @remove="handleRemove"
            @drag-start="handleDragStart"
            @drag-end="handleDragEnd"
            @drag-enter="handleDragEnter"
            @drop="handleDrop"
            @visibility-change="handleVisibilityChange"
          />
        </div>
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/vue/24/solid'
import Button from 'primevue/button'
import TabSelector from './TabSelector.vue'
import ColumnList from './ColumnList.vue'
import type { TableColumn, AvailableParameter } from '~/composables/core/types'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store/store'
import { createSelectedParameter } from '~/composables/core/types/parameters/parameter-states'
import { createTableColumn } from '~/composables/core/types/tables/table-column'

interface Props {
  open: boolean
  tableName: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

// Initialize stores
const tableStore = useTableStore()
const parameterStore = useParameterStore()

// State
const currentView = ref<'parent' | 'child'>('parent')
const showFilterOptions = ref(false)
const searchTerm = ref('')
const isGrouped = ref(true)
const sortBy = ref<'name' | 'category' | 'type'>('category')
const listRefreshKey = ref(0)
const dropPosition = ref<'above' | 'below' | null>(null)

// Computed
const currentTable = computed(() => {
  if (!props.open) return null
  return tableStore.computed.currentTable.value
})

const activeColumns = computed(() => {
  if (!currentTable.value) return []
  return currentView.value === 'parent'
    ? currentTable.value.parentColumns
    : currentTable.value.childColumns
})

const availableParameters = computed(() => {
  if (!currentTable.value) return []

  // Get active parameter IDs to filter out
  const activeIds = new Set(activeColumns.value.map((col) => col.id))

  // Get available parameters based on current view
  const parameters =
    currentView.value === 'parent'
      ? [
          ...parameterStore.parentAvailableBimParameters.value,
          ...parameterStore.parentAvailableUserParameters.value
        ]
      : [
          ...parameterStore.childAvailableBimParameters.value,
          ...parameterStore.childAvailableUserParameters.value
        ]

  // Filter out already active parameters
  return parameters.filter((param) => !activeIds.has(param.id))
})

const hasHiddenColumns = computed(() => {
  return activeColumns.value.some((col) => !col.visible)
})

// Event Handlers
function handleViewChange(view: 'parent' | 'child'): void {
  currentView.value = view
  listRefreshKey.value++
}

function toggleFilterOptions(): void {
  showFilterOptions.value = !showFilterOptions.value
}

function handleSearchUpdate(value: string): void {
  searchTerm.value = value
}

function handleGroupingUpdate(value: boolean): void {
  isGrouped.value = value
}

function handleSortUpdate(value: 'name' | 'category' | 'type'): void {
  sortBy.value = value
}

async function handleAdd(param: AvailableParameter): Promise<void> {
  try {
    if (!currentTable.value) return

    const updatedParentColumns = [...currentTable.value.parentColumns]
    const updatedChildColumns = [...currentTable.value.childColumns]

    // Get next order number
    const currentColumns =
      currentView.value === 'parent' ? updatedParentColumns : updatedChildColumns
    const nextOrder = Math.max(0, ...currentColumns.map((col) => col.order)) + 1

    // Create selected parameter and convert to column
    const selectedParam = createSelectedParameter(param, nextOrder)
    const newColumn = createTableColumn(selectedParam)

    // For user parameters, save to store first
    if (param.kind === 'user') {
      const userParams =
        currentView.value === 'parent'
          ? parameterStore.parentAvailableUserParameters.value
          : parameterStore.childAvailableUserParameters.value

      if (!userParams.find((p) => p.id === param.id)) {
        userParams.push(param)
      }
    }

    // Add to appropriate columns list
    if (currentView.value === 'parent') {
      updatedParentColumns.push(newColumn)
    } else {
      updatedChildColumns.push(newColumn)
    }

    // Update table
    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
    listRefreshKey.value++
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to add parameter:', err)
  }
}

async function handleRemove(column: TableColumn): Promise<void> {
  try {
    if (!currentTable.value) return

    const updatedParentColumns = [...currentTable.value.parentColumns]
    const updatedChildColumns = [...currentTable.value.childColumns]

    if (currentView.value === 'parent') {
      const index = updatedParentColumns.findIndex((col) => col.id === column.id)
      if (index !== -1) {
        updatedParentColumns.splice(index, 1)
      }
    } else {
      const index = updatedChildColumns.findIndex((col) => col.id === column.id)
      if (index !== -1) {
        updatedChildColumns.splice(index, 1)
      }
    }

    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
    listRefreshKey.value++
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to remove column:', err)
  }
}

async function handleVisibilityChange(
  column: TableColumn,
  visible: boolean
): Promise<void> {
  try {
    if (!currentTable.value) return

    const updatedParentColumns = [...currentTable.value.parentColumns]
    const updatedChildColumns = [...currentTable.value.childColumns]

    if (currentView.value === 'parent') {
      const index = updatedParentColumns.findIndex((col) => col.id === column.id)
      if (index !== -1) {
        updatedParentColumns[index] = { ...updatedParentColumns[index], visible }
      }
    } else {
      const index = updatedChildColumns.findIndex((col) => col.id === column.id)
      if (index !== -1) {
        updatedChildColumns[index] = { ...updatedChildColumns[index], visible }
      }
    }

    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to update column visibility:', err)
  }
}

function handleDragStart(
  event: DragEvent,
  item: TableColumn | AvailableParameter
): void {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', item.id)
  }
}

function handleDragEnd(): void {
  dropPosition.value = null
  emit('update:open', false)
}

function handleDragEnter(event: DragEvent): void {
  const target = event.currentTarget as HTMLElement
  if (!target) return

  const rect = target.getBoundingClientRect()
  const mouseY = event.clientY
  const threshold = rect.top + rect.height / 2

  dropPosition.value = mouseY < threshold ? 'above' : 'below'
}

function handleDrop(event: DragEvent): void {
  event.preventDefault()
  dropPosition.value = null

  const paramId = event.dataTransfer?.getData('text/plain')
  if (!paramId) return

  const param = availableParameters.value.find((p) => p.id === paramId)
  if (param) {
    handleAdd(param)
  }
}

async function showAllColumns(): Promise<void> {
  try {
    if (!currentTable.value) return

    const updatedParentColumns =
      currentView.value === 'parent'
        ? currentTable.value.parentColumns.map((col) => ({ ...col, visible: true }))
        : [...currentTable.value.parentColumns]

    const updatedChildColumns =
      currentView.value === 'child'
        ? currentTable.value.childColumns.map((col) => ({ ...col, visible: true }))
        : [...currentTable.value.childColumns]

    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to show all columns:', err)
  }
}
</script>

<style scoped>
.bg-background {
  background-color: white;
}
</style>
