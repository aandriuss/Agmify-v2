<template>
  <div class="flex items-center gap-2 p-4">
    <div class="flex items-center gap-2">
      <!-- Table Selection/Edit Area -->
      <div v-if="!isEditing" class="flex items-center gap-2">
        <div class="flex items-center gap-2">
          <select
            id="table-select"
            :value="selectedTableId"
            :disabled="isLoading"
            class="px-2 py-1 rounded border bg-background text-sm h-7 min-w-[250px]"
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
            color="subtle"
            class="hover:bg-primary-100"
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
            <FormButton text size="sm" color="subtle" @click="handleSave">
              <CheckIcon class="size-4" />
            </FormButton>
            <FormButton text size="sm" color="subtle" @click="cancelEdit">
              <XMarkIcon class="size-4" />
            </FormButton>
            <FormButton
              v-if="selectedTableId"
              text
              size="sm"
              color="danger"
              @click="handleDelete"
            >
              <TrashIcon class="size-4" />
            </FormButton>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1" />

    <div class="flex items-center gap-2">
      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <FormButton v-if="hasChanges" text size="sm" color="danger" @click="handleSave">
          Save
        </FormButton>
        <FormButton
          text
          size="lg"
          color="subtle"
          @click="tableStore.toggleCategoryOptions()"
        >
          Table Options
          <ChevronDownIcon v-if="!showCategoryOptions" class="size-4" />
          <ChevronUpIcon v-else class="size-4" />
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
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/solid'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { defaultTableConfig } from '~/composables/core/tables/config/defaults'

const debug = useDebug()
const store = useStore()
const tableStore = useTableStore()

// Computed properties
const existingTables = computed(() => {
  return (
    store.tablesArray.value
      ?.filter((table) => table.id !== 'new-table' && table.name !== 'Create New Table')
      .map((table) => ({
        id: table.id,
        name: table.name,
        displayName: table.name
      })) || []
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

    // First update store state with new name
    tableStore.updateTableState({
      name,
      displayName: name
    })

    // Get the full current table state and save to PostgreSQL
    const currentTable = tableStore.state.value.currentTable
    if (!currentTable) {
      throw new Error('Current table state not found')
    }

    // Save full table state to PostgreSQL
    await tableStore.saveTable(currentTable)

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
    // Use current table as template if it exists, otherwise use default
    const template = tableStore.state.value.currentTable || defaultTableConfig
    const newId = `table-${Date.now()}`

    // Create new table based on template
    const newTable = {
      ...template,
      id: newId,
      name: 'New Table',
      displayName: 'New Table',
      lastUpdateTimestamp: Date.now()
    }

    // Update store state
    tableStore.state.value.currentTable = newTable
    tableStore.state.value.currentTableId = newId
    tableStore.state.value.originalTable = null // Mark as new table

    // Add to available tables
    tableStore.state.value.availableTables.push({
      id: newId,
      name: newTable.name,
      displayName: newTable.displayName
    })

    // Update tables array in core store
    store.setTablesArray([...tableStore.state.value.availableTables])

    // Start editing mode
    await nextTick()
    startEditing()
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to create new table:', err)
  }
}

async function handleDelete() {
  if (!selectedTableId.value) {
    return
  }

  try {
    debug.log(DebugCategories.TABLE_UPDATES, 'Deleting table', {
      tableId: selectedTableId.value
    })

    // Delete the table from PostgreSQL and store
    await tableStore.deleteTable(selectedTableId.value)

    // Update the core store's tables array to reflect the deletion
    const remainingTables = existingTables.value.filter(
      (table) => table.id !== selectedTableId.value
    )
    store.setTablesArray([...remainingTables])

    // Exit editing mode
    isEditing.value = false
    nameError.value = null

    // If there are remaining tables, select the first one
    if (existingTables.value.length > 0) {
      const customEvent = { target: { value: existingTables.value[0].id } } as Event & {
        target: { value: string }
      }
      await handleTableChange(customEvent)
    }
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to delete table:', err)
    nameError.value = err instanceof Error ? err.message : 'Failed to delete table'
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
