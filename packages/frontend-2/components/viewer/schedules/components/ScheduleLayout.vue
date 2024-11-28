<template>
  <ViewerLayoutPanel :initial-width="400" @close="$emit('close')">
    <template #title>Datasets</template>

    <template #actions>
      <div class="flex items-center justify-between w-full">
        <ScheduleHeader
          :selected-table-id="selectedTableId"
          :table-name="tableName"
          :tables="tables"
          :show-category-options="showCategoryOptions"
          :has-changes="hasChanges"
          @update:selected-table-id="$emit('update:selected-table-id', $event)"
          @update:table-name="$emit('update:table-name', $event)"
          @table-change="$emit('table-change')"
          @save="$emit('save')"
          @toggle-category-options="$emit('toggle-category-options')"
        />
        <FormButton
          text
          size="sm"
          color="primary"
          :disabled="!selectedTableId"
          @click="$emit('toggle-parameter-manager')"
        >
          Manage Parameters
        </FormButton>
      </div>
    </template>

    <div class="flex flex-col">
      <ScheduleCategoryFilters
        v-if="showCategoryOptions && !isLoading"
        :show-category-options="showCategoryOptions"
        :parent-categories="parentCategories"
        :child-categories="childCategories"
        :selected-parent-categories="selectedParentCategories"
        :selected-child-categories="selectedChildCategories"
        :is-updating="isUpdating"
        @toggle-category="(type, category) => $emit('toggle-category', type, category)"
      />

      <slot></slot>
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import ScheduleHeader from './ScheduleTableHeader.vue'
import ScheduleCategoryFilters from './ScheduleCategoryFilters.vue'

defineProps({
  selectedTableId: {
    type: String,
    default: ''
  },
  tableName: {
    type: String,
    default: ''
  },
  tables: {
    type: Array as PropType<Array<{ id: string; name: string }>>,
    default: () => []
  },
  showCategoryOptions: {
    type: Boolean,
    default: false
  },
  hasChanges: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isUpdating: {
    type: Boolean,
    default: false
  },
  parentCategories: {
    type: Array as PropType<string[]>,
    required: true
  },
  childCategories: {
    type: Array as PropType<string[]>,
    required: true
  },
  selectedParentCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedChildCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  }
})

defineEmits<{
  'update:selected-table-id': [value: string]
  'update:table-name': [value: string]
  'table-change': []
  save: []
  'toggle-category-options': []
  'toggle-parameter-manager': []
  'toggle-category': [type: 'parent' | 'child', category: string]
  close: []
}>()
</script>

<style scoped>
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}
</style>
