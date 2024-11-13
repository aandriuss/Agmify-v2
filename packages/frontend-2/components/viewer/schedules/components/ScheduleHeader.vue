<template>
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-medium">Elements Schedule</h2>
    <ScheduleTableHeader
      :selected-table-id="selectedTableId"
      :table-name="tableName"
      :tables="tables"
      :show-category-options="showCategoryOptions"
      :has-changes="hasChanges"
      @update:selected-table-id="handleSelectedTableIdUpdate"
      @update:table-name="handleTableNameUpdate"
      @table-change="handleTableChange"
      @save="handleSave"
      @manage-parameters="handleManageParameters"
      @toggle-category-options="handleToggleCategoryOptions"
    />
  </div>
</template>

<script setup lang="ts">
import ScheduleTableHeader from './ScheduleTableHeader.vue'

interface Props {
  selectedTableId: string
  tableName: string
  tables: { id: string; name: string }[]
  showCategoryOptions: boolean
  hasChanges?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'update:selectedTableId': [value: string]
  'update:tableName': [value: string]
  'table-change': []
  save: []
  'manage-parameters': []
  'toggle-category-options': []
}>()

// Event handlers
const handleSelectedTableIdUpdate = (value: string) => {
  emit('update:selectedTableId', value)
}

const handleTableNameUpdate = (value: string) => {
  emit('update:tableName', value)
}

const handleTableChange = () => {
  emit('table-change')
}

const handleSave = () => {
  emit('save')
}

const handleManageParameters = () => {
  emit('manage-parameters')
}

const handleToggleCategoryOptions = () => {
  emit('toggle-category-options')
}
</script>
