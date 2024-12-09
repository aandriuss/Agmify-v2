<template>
  <div class="border rounded p-4 space-y-3">
    <!-- Header -->
    <div class="flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="font-medium">{{ parameter.name }}</div>
        <div class="text-sm text-gray-500">({{ parameter.group }})</div>
      </div>
      <div class="flex gap-2">
        <FormButton text size="sm" color="primary" @click="handleTableMapping">
          <template #icon-left>
            <TableCellsIcon class="h-4 w-4" />
          </template>
          {{
            mappedTables.length
              ? `Used in ${mappedTables.length} Tables`
              : 'Add to Tables'
          }}
        </FormButton>
        <FormButton text size="sm" color="primary" @click="$emit('edit', parameter)">
          <PencilIcon class="h-4 w-4" />
        </FormButton>
        <FormButton text size="sm" color="danger" @click="$emit('delete', parameter)">
          <TrashIcon class="h-4 w-4" />
        </FormButton>
      </div>
    </div>

    <!-- Parameter Details -->
    <div class="text-sm space-y-2">
      <div>
        <span class="font-medium">Type:</span>
        {{ parameter.type }}
      </div>
      <div v-if="parameter.type === 'fixed'">
        <span class="font-medium">Value:</span>
        {{ parameter.value }}
      </div>
      <div v-else-if="parameter.type === 'equation'">
        <span class="font-medium">Equation:</span>
        {{ parameter.equation }}
      </div>
      <div v-if="parameter.type === 'equation'" class="text-gray-500">
        Current value: {{ currentValue }}
      </div>
      <div v-if="parameter.validationRules" class="text-gray-500">
        <span class="font-medium">Validation:</span>
        {{ formatValidationRules(parameter.validationRules) }}
      </div>
    </div>

    <!-- Table Mappings -->
    <div v-if="mappedTables.length" class="mt-2">
      <div class="text-sm font-medium mb-1">Mapped Tables:</div>
      <div class="flex flex-wrap gap-2">
        <div
          v-for="table in mappedTables"
          :key="table.id"
          class="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm group"
        >
          {{ table.name }}
          <button
            class="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
            @click="handleRemoveTable(table)"
          >
            <XMarkIcon class="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>

    <!-- Ignore for now, will create a proper table later. -->
    <!-- Table Selection Dialog -->
    <TableSelectionDialog
      v-if="showTableDialog"
      v-model:selected-tables="selectedTableIds"
      :tables="availableTables"
      :parameter="parameter"
      @save="handleSaveTableMapping"
      @close="showTableDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  TableCellsIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon
} from '@heroicons/vue/24/solid'
import type { UserParameter, ValidationRules } from '~/composables/core/types'
import TableSelectionDialog from './TableSelectionDialog.vue'

const props = defineProps<{
  parameter: UserParameter
  currentValue: string
  availableTables: Array<{ id: string; name: string }>
  mappedTableIds: string[]
}>()

const emit = defineEmits<{
  (e: 'edit', parameter: UserParameter): void
  (e: 'delete', parameter: UserParameter): void
  (e: 'update-tables', parameterId: string, tableIds: string[]): void
}>()

const showTableDialog = ref(false)
const selectedTableIds = ref<string[]>([])

const mappedTables = computed(() => {
  return props.mappedTableIds
    .map((id) => props.availableTables.find((t) => t.id === id))
    .filter((table): table is { id: string; name: string } => !!table)
})

function handleTableMapping() {
  selectedTableIds.value = [...props.mappedTableIds]
  showTableDialog.value = true
}

function handleSaveTableMapping() {
  emit('update-tables', props.parameter.id, selectedTableIds.value)
  showTableDialog.value = false
}

function handleRemoveTable(table: { id: string; name: string }) {
  const newTableIds = props.mappedTableIds.filter((id) => id !== table.id)
  emit('update-tables', props.parameter.id, newTableIds)
}

function formatValidationRules(rules: ValidationRules): string {
  const parts: string[] = []
  if ('required' in rules) parts.push('Required')
  if ('min' in rules) parts.push(`Min: ${rules.min}`)
  if ('max' in rules) parts.push(`Max: ${rules.max}`)
  if ('pattern' in rules) parts.push('Has pattern')
  return parts.join(', ')
}
</script>
