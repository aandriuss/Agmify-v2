<template>
  <div class="table-options-menu">
    <!-- Left side: Navigation buttons -->
    <div class="menu-nav">
      <FormButton
        text
        size="sm"
        color="subtle"
        class="nav-button"
        :class="{ active: currentView === 'categories' }"
        @click="currentView = 'categories'"
      >
        <template #default>Category Filters</template>
        <template #icon-right>
          <ChevronRightIcon v-if="currentView !== 'categories'" class="size-4" />
        </template>
      </FormButton>
      <FormButton
        text
        size="sm"
        color="subtle"
        class="nav-button"
        :class="{ active: currentView === 'columns' }"
        @click="currentView = 'columns'"
      >
        <template #default>Column Manager</template>
        <template #icon-right>
          <ChevronRightIcon v-if="currentView !== 'columns'" class="size-4" />
        </template>
      </FormButton>
    </div>

    <!-- Right side: Component display -->
    <div class="component-display">
      <CategoryMenu v-if="currentView === 'categories'" />
      <ColumnManager
        v-else-if="currentView === 'columns'"
        :open="true"
        :table-id="tableId"
        :table-name="tableName"
        @cancel="handleColumnManagerClose"
        @apply="handleColumnManagerApply"
        @table-updated="handleTableUpdated"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'
import CategoryMenu from '~/components/core/tables/menu/CategoryMenu.vue'
import ColumnManager from '~/components/viewer/components/tables/DataTable/components/ColumnManager/index.vue'
interface TableUpdateEvent {
  tableId: string
  tableName: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const props = defineProps<{
  tableId: string
  tableName: string
}>()

const emit = defineEmits<{
  'table-updated': [updates: TableUpdateEvent]
}>()

const currentView = ref<'categories' | 'columns'>('categories')

// Event Handlers
function handleColumnManagerClose() {
  // Don't close the menu, just switch back to categories view
  currentView.value = 'categories'
}

function handleColumnManagerApply() {
  // Switch back to categories view after applying changes
  currentView.value = 'categories'
}

function handleTableUpdated(updates: TableUpdateEvent) {
  emit('table-updated', updates)
}
</script>

<style scoped>
.table-options-menu {
  display: flex;
  background-color: var(--surface-card);
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgb(0 0 0 / 10%);
  overflow: hidden;
  min-height: 300px;
}

.menu-nav {
  width: 200px;
  padding: 0.5rem;
  border-right: 1px solid var(--surface-border);
  background-color: var(--surface-section);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-button {
  width: 100%;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.nav-button.active {
  background-color: var(--surface-hover);
  font-weight: 600;
}

.component-display {
  flex: 1;
  min-width: 0;
  padding: 0.5rem;
  background-color: var(--surface-card);
}
</style>
