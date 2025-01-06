<template>
  <TableHeader
    :selected-table-id="selectedTableId"
    :table-name="tableName"
    :tables="tables"
    :has-changes="hasChanges"
    @update:selected-table-id="$emit('update:selectedTableId', $event)"
    @update:table-name="$emit('update:tableName', $event)"
    @table-change="$emit('table-change')"
    @save="$emit('save')"
  >
    <template #actions>
      <div class="flex items-center gap-2">
        <FormButton
          text
          size="sm"
          color="subtle"
          @click="$emit('toggle-category-options')"
        >
          Category filter options
          <template #icon-right>
            <ChevronDownIcon v-if="!showCategoryOptions" class="size-4" />
            <ChevronUpIcon v-else class="size-4" />
          </template>
        </FormButton>
        <FormButton text size="sm" color="subtle" @click="$emit('manage-parameters')">
          Manage parameters
        </FormButton>
      </div>
    </template>
  </TableHeader>
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/vue/24/solid'
import TableHeader from '~/components/core/tables/TableHeader.vue'

defineProps<{
  selectedTableId: string
  tableName: string
  tables: { id: string; name: string }[]
  showCategoryOptions: boolean
  hasChanges?: boolean
}>()

defineEmits<{
  'update:selectedTableId': [value: string]
  'update:tableName': [value: string]
  'table-change': []
  save: []
  'toggle-category-options': []
  'manage-parameters': []
}>()
</script>
