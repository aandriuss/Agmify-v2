<template>
  <div class="table-options-menu">
    <!-- Left side: Navigation buttons -->
    <div class="menu-nav">
      <FormButton
        size="lg"
        color="subtle"
        class="nav-button"
        :class="{ active: currentView === 'categories' }"
        @click="currentView = 'categories'"
      >
        Category Filters
        <ChevronRightIcon v-if="currentView == 'categories'" class="size-4" />
      </FormButton>
      <FormButton
        size="lg"
        color="subtle"
        class="nav-button"
        :class="{ active: currentView === 'columns' }"
        @click="currentView = 'columns'"
      >
        Column Manager
        <ChevronRightIcon v-if="currentView == 'columns'" class="size-4" />
      </FormButton>
      <FormButton
        size="lg"
        color="subtle"
        class="nav-button"
        :class="{ active: currentView === 'parameters' }"
        @click="currentView = 'parameters'"
      >
        Parameter Manager
        <ChevronRightIcon v-if="currentView === 'parameters'" class="size-4" />
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
        @table-updated="handleTableUpdated"
      />
      <ParameterManager
        v-else-if="currentView === 'parameters'"
        @update="handleParameterUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FormButton } from '@speckle/ui-components'
import { ChevronRightIcon } from '@heroicons/vue/24/solid'
import CategoryMenu from '~/components/core/tables/menu/CategoryMenu.vue'
import ColumnManager from '~/components/core/tables/DataTable/components/ColumnManager/index.vue'
import ParameterManager from '~/components/core/parameters/ParameterManager.vue'

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

const currentView = ref<'categories' | 'columns' | 'parameters'>('categories')

function handleTableUpdated(updates: TableUpdateEvent) {
  emit('table-updated', updates)
}

function handleParameterUpdate() {
  // Parameters are managed independently of tables
  // No need to emit table update
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
  width: 12rem;
  padding: 0.5rem;
  border-right: 1px solid var(--surface-border);
  background-color: var(--surface-section);
  display: flex;
  flex-direction: column;
}

.nav-button {
  width: 100%;
  min-width: 100%;
  justify-content: space-between;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: background-color 0.2s;
}

.nav-button.active {
  @apply bg-primary;

  color: white;
  border: 1px solid var(--surface-border);
  font-weight: bold; /* TODO Fix bold */
}

.component-display {
  flex: 1;
  min-width: 0;
  padding: 0.5rem;
  background-color: var(--surface-card);
}
</style>
