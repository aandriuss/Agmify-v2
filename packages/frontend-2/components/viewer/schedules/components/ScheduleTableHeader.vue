<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-2">
      <!-- Table Selection/Edit Area -->
      <div v-if="!isEditing" class="flex items-center gap-2">
        <div class="flex items-center gap-2">
          <select
            id="table-select"
            :value="selectedTableId"
            :disabled="isLoading"
            class="px-2 py-1 rounded border bg-background text-sm h-7 min-w-[180px]"
            @change="handleTableChange($event)"
          >
            <option v-for="table in existingTables" :key="table.id" :value="table.id">
              {{ table.name }}
            </option>
          </select>
          <FormButton
            v-if="selectedTableId"
            text
            size="sm"
            color="subtle"
            @click="startEditing"
          >
            <PencilIcon class="size-4" />
          </FormButton>
          <FormButton
            text
            size="sm"
            color="primary"
            class="border rounded hover:bg-primary-100"
            @click="createNewTable"
          >
            <PlusIcon class="size-4" />
          </FormButton>
        </div>
      </div>
      <div v-else class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <div class="relative">
            <label for="table-name" class="sr-only">Table Name</label>
            <input
              id="table-name"
              ref="nameInput"
              v-model="editingName"
              type="text"
              class="px-2 py-1 rounded border bg-background text-sm h-7 min-w-[180px]"
              :class="{ 'border-red-500': nameError }"
              placeholder="Enter table name"
              @keyup.enter="handleSave"
              @keyup.esc="cancelEdit"
              @input="clearError"
            />
            <div
              v-if="nameError"
              class="absolute left-0 top-full mt-1 text-xs text-red-500"
            >
              {{ nameError }}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <FormButton text size="sm" color="primary" @click="handleSave">
              <CheckIcon class="size-4" />
            </FormButton>
            <FormButton text size="sm" color="subtle" @click="cancelEdit">
              <XMarkIcon class="size-4" />
            </FormButton>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <FormButton
          v-if="hasChanges"
          text
          size="sm"
          color="danger"
          @click="handleGlobalSave"
        >
          <template #default>Save</template>
          <template #icon-right>
            <ArrowDownTrayIcon class="size-4" />
          </template>
        </FormButton>
        <FormButton
          text
          size="sm"
          color="subtle"
          @click="tableStore.toggleCategoryOptions()"
        >
          Table Options
          <template #icon-right>
            <ChevronDownIcon v-if="!showCategoryOptions" class="size-4" />
            <ChevronUpIcon v-else class="size-4" />
          </template>
        </FormButton>
        <FormButton text size="sm" color="subtle" @click="emit('manage-parameters')">
          Manage parameters
        </FormButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  PlusIcon
} from '@heroicons/vue/24/solid'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import {
  createTableColumn,
  createTableColumns
} from '~/composables/core/types/tables/table-column'
import type { TableSettings } from '~/composables/core/tables/store/types'
import type { SelectedParameter, TableColumn } from '~/composables/core/types'

const debug = useDebug()
const store = useStore()
const tableStore = useTableStore()

const emit = defineEmits<{
  'manage-parameters': []
}>()

// Computed properties
const existingTables = computed<TableSettings[]>(() => {
  return (
    store.tablesArray.value?.filter(
      (table: TableSettings) =>
        table.id !== 'new-table' && table.name !== 'Create New Table'
    ) || []
  )
})

const selectedTable = computed(() => tableStore.computed.currentTable.value)
const selectedTableId = computed(() => selectedTable.value?.id || '')
const tableName = computed(() => selectedTable.value?.name || '')
const hasChanges = computed(() => tableStore.computed.hasChanges.value)
const isLoading = computed(() => tableStore.isLoading.value)
const showCategoryOptions = computed(
  () => tableStore.state.value.ui.showCategoryOptions
)

const isEditing = ref(false)
const editingName = ref(tableName.value)
const nameInput = ref<HTMLInputElement | null>(null)
const nameError = ref<string | null>(null)

// Watch for table selection changes
watch(
  selectedTableId,
  (newId) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Selected table ID changed', {
      newId,
      availableTables: existingTables.value,
      foundTable: existingTables.value.find((t) => t.id === newId),
      isEditing: isEditing.value
    })

    if (!isEditing.value) {
      if (newId) {
        const table = selectedTable.value
        if (table) {
          editingName.value = table.name
        }
      } else {
        editingName.value = 'New Table'
      }
    }
  },
  { immediate: true }
)

// Watch for table name changes
watch(tableName, (newName) => {
  if (!isEditing.value) {
    editingName.value = newName
  }
})

function startEditing() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Starting edit mode', {
    currentName: tableName.value,
    selectedId: selectedTableId.value,
    selectedTable: selectedTable.value
  })

  editingName.value = tableName.value
  isEditing.value = true
  nameError.value = null
  nextTick(() => {
    nameInput.value?.focus()
  })
}

function clearError() {
  nameError.value = null
}

function validateName(name: string): boolean {
  const trimmedName = name.trim()
  if (!trimmedName) {
    nameError.value = 'Table name is required'
    return false
  }
  return true
}

async function handleSave() {
  const name = editingName.value
  if (!validateName(name)) {
    return
  }

  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Saving table with name:', {
      name,
      selectedId: selectedTableId.value
    })

    const current = selectedTable.value
    if (!current) {
      throw new Error('No table selected')
    }

    // Update table with new name while preserving all other properties
    const updated = {
      ...current,
      name,
      displayName: name,
      // Ensure columns have parameters
      parentColumns: current.parentColumns.map((col: TableColumn) => {
        const param = current.selectedParameters.parent.find((p) => p.id === col.id)
        return param ? createTableColumn(param) : col
      }),
      childColumns: current.childColumns.map((col: TableColumn) => {
        const param = current.selectedParameters.child.find((p) => p.id === col.id)
        return param ? createTableColumn(param) : col
      }),
      lastUpdateTimestamp: Date.now()
    }

    // Update local store
    tableStore.updateTable(updated)

    // Save to PostgreSQL only if checkmark clicked
    await tableStore.saveTable(updated)

    // Update tables array in core store
    store.setTablesArray([...store.tablesArray.value])

    isEditing.value = false
    nameError.value = null
  } catch (err) {
    // Keep editing mode if save fails
    debug.error(DebugCategories.ERROR, 'Failed to save:', err)
    nameError.value = err instanceof Error ? err.message : 'Failed to save table'
  }
}

async function handleGlobalSave() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Global save requested', {
    currentName: tableName.value,
    isEditing: isEditing.value
  })

  const current = selectedTable.value
  if (!current) {
    debug.log(DebugCategories.TABLE_UPDATES, 'No table selected')
    return
  }

  try {
    // Save current state to PostgreSQL
    await tableStore.saveTable(current)

    // Update tables array in core store
    store.setTablesArray([...store.tablesArray.value])
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to save:', err)
    nameError.value = err instanceof Error ? err.message : 'Failed to save table'
  }
}

function cancelEdit() {
  // Restore the name from the selected table
  const table = selectedTable.value
  editingName.value = table?.name || 'New Table'

  debug.log(DebugCategories.TABLE_UPDATES, 'Canceling edit', {
    selectedId: selectedTableId.value,
    restoredName: editingName.value
  })

  isEditing.value = false
  nameError.value = null
}

async function createNewTable() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table')

  try {
    // Get current table state
    const currentTable = tableStore.computed.currentTable.value
    const firstAvailableTable = store.tablesArray.value[0] as TableSettings | undefined

    // Create new table using current or first available table's state
    const newTable: TableSettings = {
      id: `table-${Date.now()}`,
      name: 'New Table',
      displayName: 'New Table',
      // Use current table's state if available, otherwise use first available table
      parentColumns: currentTable
        ? currentTable.selectedParameters.parent.map((param: SelectedParameter) =>
            createTableColumn(param)
          )
        : firstAvailableTable?.selectedParameters?.parent?.map(
            (param: SelectedParameter) => createTableColumn(param)
          ) || createTableColumns([]),
      childColumns: currentTable
        ? currentTable.selectedParameters.child.map((param: SelectedParameter) =>
            createTableColumn(param)
          )
        : firstAvailableTable?.selectedParameters?.child?.map(
            (param: SelectedParameter) => createTableColumn(param)
          ) || createTableColumns([]),
      categoryFilters: {
        selectedParentCategories: currentTable
          ? [...currentTable.categoryFilters.selectedParentCategories]
          : firstAvailableTable?.categoryFilters.selectedParentCategories || [],
        selectedChildCategories: currentTable
          ? [...currentTable.categoryFilters.selectedChildCategories]
          : firstAvailableTable?.categoryFilters.selectedChildCategories || []
      },
      // Deep clone parameters to ensure metadata is properly copied
      selectedParameters: {
        parent: currentTable
          ? currentTable.selectedParameters.parent.map((param: SelectedParameter) => ({
              ...param,
              metadata: { ...(param.metadata || {}) }
            }))
          : firstAvailableTable?.selectedParameters?.parent?.map(
              (param: SelectedParameter) => ({
                ...param,
                metadata: { ...(param.metadata || {}) }
              })
            ) || [],
        child: currentTable
          ? currentTable.selectedParameters.child.map((param: SelectedParameter) => ({
              ...param,
              metadata: { ...(param.metadata || {}) }
            }))
          : firstAvailableTable?.selectedParameters?.child?.map(
              (param: SelectedParameter) => ({
                ...param,
                metadata: { ...(param.metadata || {}) }
              })
            ) || []
      },
      filters: [],
      metadata: {},
      lastUpdateTimestamp: Date.now()
    }

    // Update local store only
    tableStore.updateTable(newTable)

    // Update tables array in core store
    store.setTablesArray([...store.tablesArray.value])

    // Start editing mode
    await nextTick()
    startEditing()
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to create new table:', err)
  }
}

async function handleTableChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newValue = target.value

  debug.log(DebugCategories.TABLE_UPDATES, 'Table selection changing', {
    from: selectedTableId.value,
    to: newValue,
    currentName: tableName.value,
    isEditing: isEditing.value
  })

  try {
    // Load selected table
    await tableStore.loadTable(newValue)
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to change table:', err)
  }
}
</script>
