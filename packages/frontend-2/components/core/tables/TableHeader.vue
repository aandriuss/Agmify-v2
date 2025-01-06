<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-2">
      <!-- Table Selection/Edit Area -->
      <div v-if="!isEditing" class="flex items-center gap-2">
        <select
          id="table-select"
          :value="selectedTableId"
          class="px-2 py-1 rounded border bg-background text-sm h-7 min-w-[180px]"
          @change="handleTableChange($event)"
        >
          <option value="">Create New Table</option>
          <option v-for="table in tables" :key="table.id" :value="table.id">
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
          v-if="hasChanges && !isEditing"
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

    <!-- Slot for additional actions -->
    <slot name="actions" />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import {
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowDownTrayIcon
} from '@heroicons/vue/24/solid'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'

const debug = useDebug()

const props = defineProps<{
  selectedTableId: string
  tableName: string
  tables: { id: string; name: string }[]
  hasChanges?: boolean
}>()

const emit = defineEmits<{
  'update:selectedTableId': [value: string]
  'update:tableName': [value: string]
  'table-change': []
  save: []
}>()

const isEditing = ref(false)
const editingName = ref('')
const nameInput = ref<HTMLInputElement | null>(null)
const nameError = ref<string | null>(null)

function startEditing() {
  debug.log(DebugCategories.TABLE_UPDATES, 'Starting edit mode', {
    currentName: props.tableName,
    selectedId: props.selectedTableId
  })

  // If we have a selected table, use its name
  if (props.selectedTableId && props.tableName !== 'Default Table') {
    editingName.value = props.tableName
  } else if (!props.selectedTableId) {
    // For new table, use "New Table"
    editingName.value = 'New Table'
  } else {
    // Fallback to current name
    editingName.value = props.tableName || ''
  }

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
    debug.log(DebugCategories.TABLE_UPDATES, 'Saving table with name:', name)
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
  editingName.value = props.tableName
  isEditing.value = false
  nameError.value = null
}

async function handleTableChange(event: Event) {
  const target = event.target as HTMLSelectElement
  const newValue = target.value

  // Update selected table ID
  emit('update:selectedTableId', newValue)

  // Wait for the selectedTableId to be updated before emitting table-change
  await nextTick()
  emit('table-change')

  // If creating new table, start editing mode
  if (!newValue) {
    debug.log(DebugCategories.TABLE_UPDATES, 'Creating new table, starting edit mode')
    await nextTick() // Wait for state updates
    startEditing()
  }
}

// Watch for table name changes
watch(
  [() => props.tableName, () => props.selectedTableId],
  ([newName, selectedId]) => {
    debug.log(DebugCategories.STATE, 'Table name or ID changed', {
      newName,
      selectedId,
      isEditing: isEditing.value
    })

    // Only update editing name if we're in edit mode
    if (isEditing.value) {
      // If we have a selected table, use its name
      if (selectedId && newName !== 'Default Table') {
        editingName.value = newName
      } else if (!selectedId) {
        // For new table, use "New Table"
        editingName.value = 'New Table'
      }
    }
  },
  { immediate: true }
)
</script>
