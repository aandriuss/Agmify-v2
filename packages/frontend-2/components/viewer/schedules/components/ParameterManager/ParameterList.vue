<template>
  <div class="space-y-4">
    <!-- Group Header with Toggle -->
    <button
      class="flex justify-between items-center cursor-pointer"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center gap-2">
        <h3 class="text-lg font-medium">{{ groupName }}</h3>
        <span class="text-sm text-gray-500">({{ parameters.length }})</span>
        <ChevronDownIcon v-if="isExpanded" class="h-5 w-5 text-gray-500" />
        <ChevronRightIcon v-else class="h-5 w-5 text-gray-500" />
      </div>
      <FormButton
        v-if="showAddButton && !isEditing"
        text
        size="sm"
        color="primary"
        @click.stop="$emit('add')"
      >
        Add Parameter
      </FormButton>
    </button>

    <div v-show="isExpanded">
      <!-- New Parameter Form -->
      <div
        v-if="isAddingNew && showAddButton && !isEditing"
        class="mb-4 p-4 border rounded bg-gray-50"
      >
        <div class="grid grid-cols-12 gap-4">
          <div class="col-span-3">
            <label class="block">
              <span class="sr-only">Parameter name</span>
              <input
                v-model="newParameterForm.name"
                type="text"
                class="w-full px-3 py-2 border rounded"
                placeholder="Parameter name"
                aria-label="Parameter name"
              />
            </label>
          </div>
          <div class="col-span-7">
            <label class="block">
              <span class="sr-only">Value or equation</span>
              <input
                v-model="newParameterForm.value"
                type="text"
                class="w-full px-3 py-2 border rounded"
                placeholder="Value or equation"
                aria-label="Value or equation"
              />
            </label>
          </div>
          <div class="col-span-2 flex gap-2 justify-end">
            <FormButton text size="sm" color="primary" @click="handleCreateNew">
              <CheckIcon class="h-4 w-4" />
            </FormButton>
            <FormButton text size="sm" color="outline" @click="$emit('cancel-add')">
              <XMarkIcon class="h-4 w-4" />
            </FormButton>
          </div>
        </div>
      </div>

      <div
        v-if="parameters.length === 0 && !isAddingNew"
        class="text-center text-gray-500 py-4"
      >
        No parameters in this group
      </div>

      <DataTable
        v-else
        :value="sortedParameters"
        :row-hover="true"
        class="p-datatable-sm"
        style="width: 100%"
      >
        <!-- Name Column -->
        <Column field="name" header="Name">
          <template #body="{ data }">
            <div v-if="editingParameter?.id === data.id">
              <label class="block">
                <span class="sr-only">Parameter name</span>
                <input
                  v-model="editForm.name"
                  type="text"
                  class="w-full px-3 py-1 border rounded"
                  placeholder="Parameter name"
                  aria-label="Parameter name"
                  @keyup.enter="handleSave(data)"
                  @keyup.esc="cancelEdit"
                />
              </label>
              <label class="block mt-2">
                <span class="sr-only">Group name</span>
                <input
                  v-model="editForm.group"
                  type="text"
                  class="w-full px-3 py-1 border rounded"
                  placeholder="Group name (optional)"
                  aria-label="Group name"
                />
              </label>
            </div>
            <span v-else class="font-medium">{{ data.name }}</span>
          </template>
        </Column>

        <!-- Value/Equation Column -->
        <Column field="value" header="Value/Equation">
          <template #body="{ data }">
            <div v-if="editingParameter?.id === data.id">
              <label class="block">
                <span class="sr-only">
                  {{ data.type === 'fixed' ? 'Value' : 'Equation' }}
                </span>
                <input
                  v-model="editForm.value"
                  type="text"
                  class="w-full px-3 py-1 border rounded"
                  :placeholder="data.type === 'fixed' ? 'Value' : 'Equation'"
                  :aria-label="data.type === 'fixed' ? 'Value' : 'Equation'"
                  @keyup.enter="handleSave(data)"
                  @keyup.esc="cancelEdit"
                />
              </label>
            </div>
            <template v-else>
              <span v-if="data.type === 'fixed'">{{ data.value || '' }}</span>
              <span v-else>{{ data.equation || '' }}</span>
            </template>
          </template>
        </Column>

        <!-- Tables Column -->
        <Column header="Used in Tables">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <FormButton
                v-if="!isEditing"
                text
                size="sm"
                color="primary"
                @click="$emit('add-to-tables', data)"
              >
                <PlusIcon class="h-4 w-4" />
                {{
                  getUsedInTables(data.id) === 'Not used in any table'
                    ? 'Add to Tables'
                    : getUsedInTables(data.id).split(',').length + ' Tables'
                }}
              </FormButton>
              <div class="flex flex-wrap gap-2">
                <div
                  v-for="tableName in getUsedInTables(data.id).split(', ')"
                  v-show="tableName !== 'Not used in any table'"
                  :key="tableName"
                  class="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm"
                >
                  {{ tableName }}
                  <button
                    v-if="!isEditing"
                    class="hover:text-red-500"
                    @click="handleRemoveFromTable(data, tableName)"
                  >
                    <XMarkIcon class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </template>
        </Column>

        <!-- Actions Column -->
        <Column header="Actions" style="width: 150px">
          <template #body="{ data }">
            <div class="flex gap-2">
              <template v-if="editingParameter?.id === data.id">
                <FormButton text size="sm" color="primary" @click="handleSave(data)">
                  <CheckIcon class="h-4 w-4" />
                </FormButton>
                <FormButton text size="sm" color="outline" @click="cancelEdit">
                  <XMarkIcon class="h-4 w-4" />
                </FormButton>
              </template>
              <template v-else>
                <FormButton
                  v-if="!isEditing || editingParameter?.id === data.id"
                  text
                  size="sm"
                  color="primary"
                  @click="startEdit(data)"
                >
                  <PencilIcon class="h-4 w-4" />
                </FormButton>
                <FormButton
                  v-if="!isEditing"
                  text
                  size="sm"
                  color="danger"
                  @click="handleDelete(data)"
                >
                  <TrashIcon class="h-4 w-4" />
                </FormButton>
              </template>
            </div>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/vue/24/solid'
import type { CustomParameter } from '~/composables/core/types'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

const props = defineProps<{
  groupName: string
  parameters: CustomParameter[]
  showAddButton?: boolean
  getCurrentValue: (parameter: CustomParameter) => string
  getUsedInTables: (parameterId: string) => string
  isAddingNew?: boolean
  availableTables: Array<{ id: string; name: string }>
}>()

const emit = defineEmits<{
  (e: 'add'): void
  (e: 'edit', parameter: CustomParameter): void
  (e: 'delete', parameter: CustomParameter): void
  (e: 'add-to-tables', parameter: CustomParameter): void
  (e: 'remove-from-table', parameter: CustomParameter, tableName: string): void
  (e: 'update', parameter: CustomParameter): void
  (e: 'create', parameter: Omit<CustomParameter, 'id'>): void
  (e: 'cancel-add'): void
}>()

const isExpanded = ref(true)
const editingParameter = ref<CustomParameter | null>(null)
const editForm = ref({
  name: '',
  value: '',
  group: '',
  equation: ''
})

const newParameterForm = ref({
  name: '',
  value: '',
  group: ''
})

const isEditing = computed(() => editingParameter.value !== null)

const sortedParameters = computed(() => {
  return [...props.parameters].sort((a, b) => a.name.localeCompare(b.name))
})

function detectType(value: string): 'fixed' | 'equation' {
  const trimmedValue = value.trim()
  // Check if it's a valid number (including decimals)
  const isNumeric =
    !isNaN(Number(trimmedValue)) &&
    !isNaN(parseFloat(trimmedValue)) &&
    trimmedValue !== ''
  return isNumeric ? 'fixed' : 'equation'
}

function validateValue(value: string, type: 'fixed' | 'equation'): boolean {
  if (type === 'fixed') {
    return !isNaN(Number(value)) && value.trim() !== ''
  }
  return value.trim() !== ''
}

function startEdit(parameter: CustomParameter) {
  editingParameter.value = parameter
  editForm.value = {
    name: parameter.name,
    value:
      parameter.type === 'fixed'
        ? parameter.value?.toString() || ''
        : parameter.equation?.toString() || '',
    group: parameter.group?.toString() || '',
    equation: parameter.equation?.toString() || ''
  }
}

function cancelEdit() {
  editingParameter.value = null
  editForm.value = { name: '', value: '', group: '', equation: '' }
}

function handleCreateNew() {
  if (!newParameterForm.value.name.trim()) return

  const type = detectType(newParameterForm.value.value)
  if (!validateValue(newParameterForm.value.value, type)) return

  const newParameter = {
    name: newParameterForm.value.name.trim(),
    type,
    value: type === 'fixed' ? newParameterForm.value.value.trim() : undefined,
    equation: type === 'equation' ? newParameterForm.value.value.trim() : undefined,
    group: newParameterForm.value.group.trim() || props.groupName,
    field: newParameterForm.value.name.trim(),
    header: newParameterForm.value.name.trim(),
    category: 'Custom Parameters',
    visible: true,
    removable: true,
    order: 0
  }

  emit('create', newParameter)
  newParameterForm.value = { name: '', value: '', group: '' }
}

function handleSave(originalParameter: CustomParameter) {
  if (!editForm.value.name.trim()) return

  const type = detectType(editForm.value.value)
  if (!validateValue(editForm.value.value, type)) return

  const updatedParameter: CustomParameter = {
    ...originalParameter,
    name: editForm.value.name.trim(),
    type,
    value: type === 'fixed' ? editForm.value.value.trim() : undefined,
    equation: type === 'equation' ? editForm.value.value.trim() : undefined,
    group: editForm.value.group.trim() || originalParameter.group,
    field: editForm.value.name.trim(),
    header: editForm.value.name.trim()
  }

  emit('update', updatedParameter)
  cancelEdit()
}

function handleDelete(parameter: CustomParameter) {
  emit('delete', parameter)
}

function handleRemoveFromTable(parameter: CustomParameter, tableName: string) {
  emit('remove-from-table', parameter, tableName)
}
</script>
