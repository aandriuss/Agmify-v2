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
        :schedule-data="store.scheduleData.value"
        :evaluated-data="store.evaluatedData.value"
        :table-data="store.tableData.value"
        :parent-elements="parentElements"
        :child-elements="childElements"
        :parent-parameter-columns="tableStore.currentTable?.value?.parentColumns || []"
        :child-parameter-columns="tableStore.currentTable?.value?.childColumns || []"
        :available-parent-headers="store.availableHeaders.value.parent"
        :available-child-headers="store.availableHeaders.value.child"
        :is-test-mode="isTestMode"
        @update:is-test-mode="updateTestMode"
      />
    </div>
  </ViewerLayoutPanel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import type { ElementData } from '~/composables/core/types'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'

defineEmits(['close'])

const store = useStore()
const tableStore = useTableStore()
const isTestMode = ref(false)

// Computed properties for relationship data
const parentElements = computed<ElementData[]>(() => {
  const data = store.scheduleData.value || []
  return data.filter((el) => !el.isChild)
})

const childElements = computed<ElementData[]>(() => {
  const data = store.scheduleData.value || []
  return data.filter((el) => el.isChild)
})

function updateTestMode(value: boolean) {
  isTestMode.value = value
}
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
