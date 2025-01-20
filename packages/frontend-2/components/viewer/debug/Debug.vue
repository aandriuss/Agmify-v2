<template>
  <ViewerLayoutPanel @close="$emit('close')">
    <template #title>Debug</template>
    <template #actions>
      <div class="flex items-center gap-2">
        <!-- Add any debug actions here -->
      </div>
    </template>

    <div class="debug-container">
      <DebugPanel
        :show-test-mode="true"
        :show-table-categories="true"
        :show-parameter-categories="true"
        :show-bim-data="true"
        :show-parameter-stats="true"
        :show-data-structure="true"
        :schedule-data="store.scheduleData.value || []"
        :evaluated-data="store.evaluatedData.value || []"
        :table-data="store.tableData.value || []"
        :parent-elements="parentElements"
        :child-elements="childElements"
        :parent-parameter-columns="store.currentTableColumns.value || []"
        :child-parameter-columns="store.currentDetailColumns.value || []"
        :available-parent-headers="store.availableHeaders.value.parent"
        :available-child-headers="store.availableHeaders.value.child"
      />
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore } from '~/composables/core/store'
import type { ElementData } from '~/composables/core/types'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'

defineEmits(['close'])

const store = useStore()

// Computed properties for relationship data
const parentElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.metadata?.isParent)
})

const childElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.isChild)
})
</script>

<style scoped>
.debug-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
  min-height: 900px;
}
</style>
