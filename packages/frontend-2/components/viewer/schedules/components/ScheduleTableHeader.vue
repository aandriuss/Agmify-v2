<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-2">
      <!-- Table Selection/Edit Area -->
      <div v-if="!isEditing" class="flex items-center gap-2">
        <div class="flex items-center gap-2">
          <select
            id="table-select"
            :value="props.selectedTableId"
            :disabled="props.isLoading"
            class="px-2 py-1 rounded border bg-background text-sm h-7 min-w-[180px]"
            @change="handleTableChange($event)"
          >
            <option v-for="table in existingTables" :key="table.id" :value="table.id">
              {{ table.name }}
            </option>
          </select>
          <FormButton
            v-if="props.selectedTableId"
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
          v-if="props.hasChanges"
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
          @click="emit('toggle-category-options')"
        >
          Category filter options
          <template #icon-right>
            <ChevronDownIcon v-if="!props.showCategoryOptions" class="size-4" />
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

const debug = useDebug()

const props = defineProps<{
  selectedTableId: string
  tableName: string
  tables: { id: string; name: string }[]
  showCategoryOptions: boolean
  hasChanges?: boolean
  isLoading?: boolean
}>()

// Computed properties
const existingTables = computed(() => {
  return props.tables.filter(
    (table) => table.id !== 'new-table' && table.name !== 'Create New Table'
  )
})

const selectedTable = computed(() => {
  return existingTables.value.find((table) => table.id === props.selectedTableId)
})

const emit = defineEmits<{
  'update:selectedTableId': [value: string]
  'update:tableName': [value: string]
  'table-change': []
  save: []
  'toggle-category-options': []
  'manage-parameters': []
}>()

const isEditing = ref(false)
const editingName = ref(props.tableName)
const nameInput = ref<HTMLInputElement | null>(null)
const nameError = ref<string | null>(null)

// Watch for table selection changes
watch(
  () => props.selectedTableId,
  (newId) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Selected table ID changed', {
      newId,
      availableTables: props.tables,
      foundTable: props.tables.find((t) => t.id === newId),
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

// Debug watcher for tables prop
watch(
  () => props.tables,
  (newTables) => {
    debug.log(DebugCategories.TABLE_UPDATES, 'Tables array changed', {
      tableCount: newTables.length,
      tableIds: newTables.map((t) => t.id),
      currentSelectedId: props.selectedTableId,
      matchingTable: newTables.find((t) => t.id === props.selectedTableId)
    })
  },
  { immediate: true }
)

// Watch for table name changes
watch(
  () => props.tableName,
  (newName) => {
    if (!isEditing.value) {
      editingName.value = newName
    }
  }
)

function startEditing() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Starting edit mode', {
    currentName: props.tableName,
    selectedId: props.selectedTableId,
    selectedTable: selectedTable.value
  })

  editingName.value = props.tableName
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
      selectedId: props.selectedTableId
    })

    // Update the name first
    emit('update:tableName', name)
    // Wait for next tick to ensure name is updated
    await nextTick()
    // Then trigger save
    emit('save')

    isEditing.value = false
    nameError.value = null
  } catch (err) {
    // Keep editing mode if save fails
    debug.error(DebugCategories.ERROR, 'Failed to save:', err)
    nameError.value = err instanceof Error ? err.message : 'Failed to save table'
  }
}

function handleGlobalSave() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Global save requested', {
    currentName: props.tableName,
    isEditing: isEditing.value
  })

  // If no name or empty name, start editing
  if (!props.tableName?.trim()) {
    debug.log(DebugCategories.TABLE_UPDATES, 'No table name, starting edit mode')
    startEditing()
    return
  }

  try {
    // Validate current name
    if (!validateName(props.tableName)) {
      debug.log(DebugCategories.TABLE_UPDATES, 'Invalid table name, starting edit mode')
      startEditing()
      return
    }

    debug.log(DebugCategories.TABLE_UPDATES, 'Emitting save with valid name')
    emit('save')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to save:', err)
    nameError.value = err instanceof Error ? err.message : 'Failed to save table'
    // Start editing if save fails
    startEditing()
  }
}

function cancelEdit() {
  // Restore the name from the selected table
  if (props.selectedTableId) {
    const table = selectedTable.value
    editingName.value = table ? table.name : props.tableName
  } else {
    editingName.value = props.tableName
  }

  debug.log(DebugCategories.TABLE_UPDATES, 'Canceling edit', {
    selectedId: props.selectedTableId,
    restoredName: editingName.value
  })

  isEditing.value = false
  nameError.value = null
}

async function createNewTable() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table')

  try {
    // Clear selection and set default name
    emit('update:selectedTableId', '')
    emit('update:tableName', 'New Table')

    // Wait for updates to propagate
    await nextTick()
    emit('table-change')

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
    from: props.selectedTableId,
    to: newValue,
    currentName: props.tableName,
    isEditing: isEditing.value
  })

  try {
    // Update selected table ID first
    emit('update:selectedTableId', newValue)

    // Then update name based on selection
    const table = props.tables.find((t) => t.id === newValue)
    if (table) {
      emit('update:tableName', table.name)
    }

    // Wait for updates to propagate
    await nextTick()
    emit('table-change')
  } catch (err) {
    debug.error(DebugCategories.ERROR, 'Failed to change table:', err)
  }
}
</script>
