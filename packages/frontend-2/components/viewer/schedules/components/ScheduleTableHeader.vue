<template>
  <div class="flex items-center gap-2">
    <div class="flex items-center gap-2 flex-1">
      <!-- Table Selection Dropdown -->
      <label for="table-select" class="text-sm">Select Table:</label>
      <select
        id="table-select"
        :value="selectedTableId"
        class="px-2 py-1 rounded border bg-background text-sm h-8 min-w-[150px]"
        @change="handleTableChange($event)"
      >
        <option value="">Create New Table</option>
        <option v-for="table in tables" :key="table.id" :value="table.id">
          {{ table.name }}
        </option>
      </select>

      <label for="table-name" class="sr-only">Table Name</label>
      <input
        id="table-name"
        :value="tableName"
        type="text"
        class="flex-1 px-2 py-1 rounded border bg-background text-sm h-8"
        placeholder="Enter table name"
        @input="handleNameChange($event)"
      />

      <FormButton
        text
        size="sm"
        color="primary"
        :disabled="!tableName || (!selectedTableId && !hasChanges)"
        @click="emit('save')"
      >
        {{ selectedTableId ? 'Update' : 'Save New' }}
      </FormButton>

      <!-- Parameter Manager Button -->
      <FormButton
        text
        size="sm"
        color="primary"
        :disabled="!selectedTableId"
        @click="emit('manage-parameters')"
      >
        Manage Parameters
      </FormButton>
    </div>

    <!-- Category Filter Button -->
    <FormButton
      text
      size="sm"
      color="subtle"
      :icon-right="showCategoryOptions ? ChevronUpIcon : ChevronDownIcon"
      @click="emit('toggle-category-options')"
    >
      Category filter options
    </FormButton>
  </div>
</template>

<script setup lang="ts">
import { FormButton } from '@speckle/ui-components'
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'

defineProps<{
  selectedTableId: string
  tableName: string
  tables: { id: string; name: string }[]
  showCategoryOptions: boolean
  hasChanges?: boolean
}>()

const emit = defineEmits<{
  'update:selectedTableId': [value: string]
  'update:tableName': [value: string]
  'table-change': []
  save: []
  'manage-parameters': []
  'toggle-category-options': []
}>()

function handleTableChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:selectedTableId', target.value)
  emit('table-change')
}

function handleNameChange(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:tableName', target.value)
}
</script>
