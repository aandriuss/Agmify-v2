<template>
  <LayoutDialog
    :open="true"
    max-width="xl"
    :title="dialogTitle"
    :buttons="dialogButtons"
    @update:open="$emit('close')"
  >
    <div class="p-4 space-y-4">
      <!-- Parameter Info -->
      <div
        v-if="parameter"
        class="flex items-center justify-between bg-gray-50 p-3 rounded"
      >
        <div>
          <div class="font-medium">{{ parameter.name }}</div>
          <div class="text-sm text-gray-500">
            Type: {{ parameter.type }}
            <span v-if="parameter.group">| Group: {{ parameter.group }}</span>
          </div>
        </div>
        <div class="text-sm text-gray-500">
          Selected: {{ modelValue.length }} table(s)
        </div>
      </div>

      <!-- Search and Filters -->
      <div class="flex items-center gap-4">
        <div class="flex-1">
          <div class="relative">
            <MagnifyingGlassIcon
              class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
            />
            <label for="search-tables" class="sr-only">Search tables</label>
            <input
              id="search-tables"
              v-model="searchQuery"
              type="text"
              class="w-full pl-9 pr-3 py-2 border rounded"
              placeholder="Search tables..."
            />
          </div>
        </div>
        <div class="flex items-center gap-2">
          <FormButton
            text
            size="sm"
            color="primary"
            :disabled="modelValue.length === filteredTables.length"
            @click="selectAll"
          >
            Select All Filtered
          </FormButton>
          <FormButton
            text
            size="sm"
            color="primary"
            :disabled="modelValue.length === 0"
            @click="deselectAll"
          >
            Clear Selection
          </FormButton>
        </div>
      </div>

      <!-- Tables List -->
      <div class="border rounded">
        <div v-if="filteredTables.length === 0" class="p-4 text-center text-gray-500">
          No tables found matching your search
        </div>
        <div v-else class="divide-y max-h-[400px] overflow-y-auto">
          <div
            v-for="table in filteredTables"
            :key="table.id"
            class="flex items-center p-3 hover:bg-gray-50 transition-colors"
            :class="{ 'bg-gray-50': isSelected(table.id) }"
          >
            <div class="flex-1">
              <label :for="table.id" class="flex items-center gap-3 cursor-pointer">
                <input
                  :id="table.id"
                  type="checkbox"
                  :checked="isSelected(table.id)"
                  class="h-4 w-4 rounded border-gray-300"
                  @change="toggleTable(table.id)"
                />
                <div>
                  <div class="font-medium">{{ table.name }}</div>
                  <div v-if="table.description" class="text-sm text-gray-500">
                    {{ table.description }}
                  </div>
                </div>
              </label>
            </div>
            <div v-if="table.parameterCount" class="text-sm text-gray-500 pr-2">
              {{ table.parameterCount }} parameter(s)
            </div>
          </div>
        </div>
      </div>

      <!-- Selection Summary -->
      <div v-if="modelValue.length > 0" class="bg-blue-50 p-3 rounded">
        <div class="font-medium mb-1">Selected Tables:</div>
        <div class="text-sm flex flex-wrap gap-2">
          <div
            v-for="tableId in modelValue"
            :key="tableId"
            class="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border"
          >
            {{ getTableName(tableId) }}
            <button class="hover:text-red-500" @click="toggleTable(tableId)">
              <XMarkIcon class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </LayoutDialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import type { LayoutDialogButton } from '@speckle/ui-components'
import type { CustomParameter } from '~/composables/core/types'

interface Table {
  id: string
  name: string
  description?: string
  parameterCount?: number
}

const props = defineProps<{
  modelValue: string[]
  tables: Table[]
  parameter: CustomParameter | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'save'): void
  (e: 'close'): void
}>()

const searchQuery = ref('')

const dialogTitle = computed(() =>
  props.parameter ? `Add "${props.parameter.name}" to Tables` : 'Select Tables'
)

const filteredTables = computed(() => {
  if (!searchQuery.value) return props.tables

  const query = searchQuery.value.toLowerCase()
  return props.tables.filter(
    (table) =>
      table.name.toLowerCase().includes(query) ||
      table.description?.toLowerCase().includes(query)
  )
})

const dialogButtons = computed<LayoutDialogButton[]>(() => [
  {
    text: `Save${
      props.modelValue.length ? ` (${props.modelValue.length} tables)` : ''
    }`,
    props: { color: 'primary' },
    onClick: () => emit('save')
  },
  {
    text: 'Cancel',
    props: { color: 'outline' },
    onClick: () => emit('close')
  }
])

function isSelected(tableId: string): boolean {
  return props.modelValue.includes(tableId)
}

function getTableName(tableId: string): string {
  const table = props.tables.find((t) => t.id === tableId)
  return table?.name || tableId
}

function toggleTable(tableId: string) {
  const currentSelection = [...props.modelValue]
  const index = currentSelection.indexOf(tableId)

  if (index === -1) {
    currentSelection.push(tableId)
  } else {
    currentSelection.splice(index, 1)
  }

  emit('update:modelValue', currentSelection)
}

function selectAll() {
  const newSelection = Array.from(
    new Set([...props.modelValue, ...filteredTables.value.map((table) => table.id)])
  )
  emit('update:modelValue', newSelection)
}

function deselectAll() {
  const filteredIds = filteredTables.value.map((table) => table.id)
  const remaining = props.modelValue.filter((id) => !filteredIds.includes(id))
  emit('update:modelValue', remaining)
}
</script>
