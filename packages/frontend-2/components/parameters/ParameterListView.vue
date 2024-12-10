<template>
  <div class="parameter-list-view">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-2xl font-bold">Parameters</h2>
      <p class="text-gray-600">View and manage parameters across all projects.</p>
    </div>

    <!-- Main Content -->
    <div class="parameter-content">
      <BaseDataTable
        :table-id="_tableId"
        :table-name="_tableName"
        :data="parameterData"
        :columns="columns"
        :loading="isLoading"
        :initial-state="initialState"
        @update:expanded-rows="handleExpandedRowsUpdate"
        @update:columns="handleColumnsUpdate"
        @column-reorder="handleColumnReorder"
        @table-updated="handleTableUpdated"
        @column-visibility-change="handleColumnVisibilityChange"
        @sort="handleSort"
        @filter="handleFilter"
        @error="handleError"
        @retry="handleRetry"
      >
        <template #empty>
          <div class="p-4 text-center text-gray-500">
            <div class="flex flex-col items-center gap-2">
              <span>No parameters available.</span>
              <span class="text-sm">
                Try adjusting your filters or create new parameters.
              </span>
            </div>
          </div>
        </template>

        <template #loading>
          <div class="p-4 text-center text-gray-500">
            <div class="flex flex-col items-center gap-2">
              <span>Loading parameters...</span>
            </div>
          </div>
        </template>

        <template #error>
          <div class="p-4 text-center text-red-500">
            <div class="flex flex-col items-center gap-2">
              <span>{{ currentError?.message || 'Failed to load parameters' }}</span>
              <button
                class="text-sm text-primary-600 hover:text-primary-700"
                @click="handleRetry"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </template>
      </BaseDataTable>

      <!-- Action Buttons -->
      <div class="mt-4 flex justify-end gap-2">
        <FormButton color="primary" @click="handleCreateParameter">
          Create Parameter
        </FormButton>
        <FormButton
          v-if="hasSelectedParameters"
          color="outline"
          @click="handleEditParameters"
        >
          Edit Selected
        </FormButton>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="error"
      class="fixed bottom-4 right-4 p-4 bg-red-50 text-red-600 rounded shadow-lg"
    >
      {{ error.message }}
      <button class="ml-2 text-sm underline hover:text-red-700" @click="handleRetry">
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { FormButton } from '@speckle/ui-components'
import BaseDataTable from '~/components/tables/DataTable/BaseDataTable.vue'
import type { TableState } from '../tables/DataTable/types'
import { TableError } from '~/components/tables/DataTable/utils'
import type { ScheduleRow } from '../viewer/schedules/types'
import type { UserColumnDef } from '~/composables/core/types/tables/column-types'
import { createUserColumnDefWithDefaults } from '~/composables/core/types/tables/column-types'

// Props
interface Props {
  tableId: string
  tableName?: string
}

const props = withDefaults(defineProps<Props>(), {
  tableName: 'Parameters'
})

// Props with underscore prefix to avoid unused var warning
const _tableId = props.tableId
const _tableName = props.tableName

// State
const error = ref<Error | null>(null)
const currentError = computed(() => error.value)
const isLoading = ref(false)
const parameterData = ref<ScheduleRow[]>([])
const columns = ref<UserColumnDef[]>([])
const initialState = ref<TableState | undefined>(undefined)
const selectedParameters = ref<ScheduleRow[]>([])

// Computed
const hasSelectedParameters = computed(() => selectedParameters.value.length > 0)

// Event Handlers
function handleExpandedRowsUpdate(rows: unknown): void {
  try {
    if (!Array.isArray(rows)) return
    const validRows = rows.filter((row): row is ScheduleRow => 'name' in row)
    parameterData.value = validRows
  } catch (err) {
    handleError(err)
  }
}

function handleColumnsUpdate(newColumns: unknown): void {
  try {
    if (!Array.isArray(newColumns)) return
    const validColumns = newColumns.filter(
      (col): col is UserColumnDef =>
        typeof col === 'object' &&
        col !== null &&
        'kind' in col &&
        (col as UserColumnDef).kind === 'user'
    )
    columns.value = validColumns
  } catch (err) {
    handleError(err)
  }
}

function handleColumnReorder(event: unknown): void {
  try {
    if (
      !event ||
      typeof event !== 'object' ||
      !('dragIndex' in event) ||
      !('dropIndex' in event) ||
      typeof event.dragIndex !== 'number' ||
      typeof event.dropIndex !== 'number'
    ) {
      return
    }

    const reorderedColumns = [...columns.value]
    const [movedColumn] = reorderedColumns.splice(event.dragIndex, 1)
    if (movedColumn) {
      reorderedColumns.splice(event.dropIndex, 0, movedColumn)
      columns.value = reorderedColumns
    }
  } catch (err) {
    handleError(err)
  }
}

function handleTableUpdated(): void {
  // Handle any necessary updates
}

function handleColumnVisibilityChange(): void {
  // Handle visibility changes
}

async function handleSort(field: unknown, order: unknown): Promise<void> {
  try {
    if (typeof field !== 'string' || typeof order !== 'number') return
    isLoading.value = true
    // Implement sorting logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleFilter(filters: unknown): Promise<void> {
  try {
    if (!filters || typeof filters !== 'object') return
    isLoading.value = true
    // Implement filtering logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleCreateParameter(): Promise<void> {
  try {
    isLoading.value = true
    // Implement parameter creation logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

async function handleEditParameters(): Promise<void> {
  try {
    isLoading.value = true
    // Implement parameter editing logic here
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

function handleError(err: unknown): void {
  const message = err instanceof Error ? err.message : 'An unknown error occurred'
  const tableError = new TableError(message, err)
  error.value = new Error(tableError.message)
}

async function handleRetry(): Promise<void> {
  try {
    error.value = null
    isLoading.value = true
    await initialize()
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// Initialize component
async function initialize(): Promise<void> {
  try {
    isLoading.value = true
    // Load initial data
    await new Promise((resolve) => setTimeout(resolve, 100)) // Placeholder for actual API call

    // Set initial columns
    columns.value = [
      createUserColumnDefWithDefaults({
        id: 'name',
        name: 'Name',
        field: 'name',
        header: 'Name',
        type: 'fixed',
        visible: true,
        group: 'default',
        removable: false,
        order: 0
      }),
      createUserColumnDefWithDefaults({
        id: 'category',
        name: 'Category',
        field: 'category',
        header: 'Category',
        type: 'fixed',
        visible: true,
        group: 'default',
        removable: true,
        order: 1
      }),
      createUserColumnDefWithDefaults({
        id: 'kind',
        name: 'Kind',
        field: 'kind',
        header: 'Kind',
        type: 'fixed',
        visible: true,
        group: 'default',
        removable: true,
        order: 2
      }),
      createUserColumnDefWithDefaults({
        id: 'sourceValue',
        name: 'Source Value',
        field: 'sourceValue',
        header: 'Source Value',
        type: 'fixed',
        visible: true,
        group: 'default',
        removable: true,
        order: 3
      }),
      createUserColumnDefWithDefaults({
        id: 'equation',
        name: 'Equation',
        field: 'equation',
        header: 'Equation',
        type: 'equation',
        visible: true,
        group: 'default',
        removable: true,
        order: 4
      })
    ]

    // Set initial data
    parameterData.value = []
  } catch (err) {
    handleError(err)
  } finally {
    isLoading.value = false
  }
}

// Call initialize on component mount
initialize()
</script>

<style scoped>
.parameter-list-view {
  @apply p-6;
}

.parameter-content {
  @apply bg-white rounded-lg shadow p-6;
}
</style>
