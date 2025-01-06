<template>
  <div class="table-layout">
    <header class="table-header">
      <div class="table-header-left">
        <div v-if="showTableSelector" class="table-selector">
          <!-- Changed from class to direct utility -->
          <label for="table-select" class="sr-only">Select Table</label>
          <select
            id="table-select"
            :value="selectedTableId"
            class="table-select"
            @change="handleTableSelect"
          >
            <option v-for="table in tables" :key="table.id" :value="table.id">
              {{ table.name }}
            </option>
          </select>
        </div>
        <div v-if="showTableName" class="table-name">
          <!-- Changed from class to direct utility -->
          <label for="table-name-input" class="sr-only">Table Name</label>
          <input
            id="table-name-input"
            :value="tableName"
            type="text"
            class="table-name-input"
            placeholder="Table Name"
            @input="handleTableNameInput"
          />
        </div>
      </div>

      <div class="table-header-right">
        <slot name="actions">
          <button
            v-if="showCategoryOptions"
            type="button"
            class="action-button"
            @click="$emit('toggle-category-options')"
          >
            Categories
          </button>
          <button
            v-if="showParameterManager"
            type="button"
            class="action-button"
            @click="$emit('toggle-parameter-manager')"
          >
            Parameters
          </button>
          <button
            v-if="hasChanges"
            type="button"
            class="action-button primary"
            :disabled="isLoading || isUpdating"
            @click="$emit('save')"
          >
            Save
          </button>
          <button type="button" class="action-button" @click="$emit('close')">
            Close
          </button>
        </slot>
      </div>
    </header>

    <main class="table-content">
      <slot />
    </main>

    <footer v-if="$slots.footer" class="table-footer">
      <slot name="footer" />
    </footer>
  </div>
</template>

<script setup lang="ts">
interface Table {
  id: string
  name: string
}

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
    type: Array as () => Table[],
    default: () => []
  },
  showTableSelector: {
    type: Boolean,
    default: false
  },
  showTableName: {
    type: Boolean,
    default: false
  },
  showCategoryOptions: {
    type: Boolean,
    default: false
  },
  showParameterManager: {
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
  }
})

const emit = defineEmits<{
  (e: 'update:selected-table-id', value: string): void
  (e: 'update:table-name', value: string): void
  (e: 'toggle-category-options'): void
  (e: 'toggle-parameter-manager'): void
  (e: 'save'): void
  (e: 'close'): void
}>()

function handleTableSelect(event: Event) {
  const select = event.target as HTMLSelectElement
  emit('update:selected-table-id', select.value)
}

function handleTableNameInput(event: Event) {
  const input = event.target as HTMLInputElement
  emit('update:table-name', input.value)
}
</script>

<style scoped>
.table-layout {
  @apply flex flex-col h-full bg-foundation;
}

.table-header {
  @apply flex justify-between items-center p-4 border-b bg-foundation-2;
}

.table-header-left {
  @apply flex items-center gap-4;
}

.table-header-right {
  @apply flex items-center gap-2;
}

.table-selector {
  @apply w-64;
}

.table-select {
  @apply w-full px-3 py-2 border rounded-md bg-foundation text-sm 
    focus:outline-none focus:ring-2 focus:ring-primary-focus;
}

.table-name {
  @apply w-64;
}

.table-name-input {
  @apply w-full px-3 py-2 border rounded-md bg-foundation text-sm 
    focus:outline-none focus:ring-2 focus:ring-primary-focus;
}

.table-content {
  @apply flex-1 relative overflow-auto;
}

.table-footer {
  @apply p-4 border-t bg-foundation-2;
}

.action-button {
  @apply px-4 py-2 text-sm font-medium rounded-md border transition-colors
    bg-foundation text-foreground hover:bg-foundation-2 
    focus:outline-none focus:ring-2 focus:ring-primary-focus;
}

.action-button.primary {
  @apply bg-primary text-foreground-on-primary border-transparent hover:bg-primary-focus;
}

.action-button:disabled {
  @apply opacity-50 cursor-not-allowed;
}
</style>
