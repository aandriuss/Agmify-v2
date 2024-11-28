<template>
  <ViewerLayoutPanel :initial-width="400" @close="handleClose">
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
      <!-- Category Filters -->
      <div
        v-if="showCategoryOptions && !isLoading"
        class="sticky top-10 px-2 py-2 flex flex-col justify-start text-left border-b-2 border-primary-muted bg-foundation"
      >
        <ScheduleCategoryFilters
          :show-category-options="showCategoryOptions"
          :parent-categories="parentCategories"
          :child-categories="childCategories"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :is-updating="isUpdating"
          @toggle-category="$emit('toggle-category', $event)"
        />
      </div>

      <slot></slot>
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import ScheduleHeader from './ScheduleTableHeader.vue'
import ScheduleCategoryFilters from './ScheduleCategoryFilters.vue'
import type { Category } from '../types'

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
    type: Array as PropType<Category[]>,
    required: true
  },
  childCategories: {
    type: Array as PropType<Category[]>,
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
  'toggle-category': [category: string]
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

.sticky {
  position: sticky;
}

.top-10 {
  top: 2.5rem;
}

.border-b-2 {
  border-bottom-width: 2px;
}

.border-primary-muted {
  border-color: var(--color-primary-muted);
}

.bg-foundation {
  background-color: var(--color-foundation);
}

.px-2 {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.py-2 {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
</style>
