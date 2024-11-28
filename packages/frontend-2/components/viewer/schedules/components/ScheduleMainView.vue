<template>
  <div
    ref="viewerContainer"
    class="viewer-container"
    style="width: 100%; height: 100%; min-height: 400px"
  >
    <TestDataTable v-if="isTestMode" />

    <template v-else>
      <div class="schedule-table-container">
        <ScheduleTableView
          v-if="!isLoading"
          :selected-table-id="selectedTableId"
          :current-table="currentTable"
          :is-initialized="isInitialized"
          :table-name="tableName"
          :current-table-id="currentTableId"
          :table-key="tableKey"
          :loading-error="error"
          :parent-base-columns="parentBaseColumns"
          :parent-available-columns="parentAvailableColumns"
          :parent-visible-columns="parentVisibleColumns"
          :child-base-columns="childBaseColumns"
          :child-available-columns="childAvailableColumns"
          :child-visible-columns="childVisibleColumns"
          :schedule-data="scheduleData"
          :evaluated-data="evaluatedData"
          :table-data="tableData"
          :is-loading="isLoading"
          :is-loading-additional-data="isLoadingAdditionalData"
          :no-categories-selected="!hasSelectedCategories"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          @update:both-columns="$emit('update:both-columns', $event)"
          @table-updated="$emit('table-updated')"
          @column-visibility-change="$emit('column-visibility-change')"
          @row-expand="$emit('row-expand', $event)"
          @row-collapse="$emit('row-collapse', $event)"
          @error="$emit('error', $event)"
        />

        <ScheduleDataManagement
          v-if="!isLoading"
          ref="dataComponent"
          :schedule-data="scheduleData"
          :evaluated-data="evaluatedData"
          :custom-parameters="customParameters"
          :merged-table-columns="parentAvailableColumns"
          :merged-detail-columns="childAvailableColumns"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :is-initialized="isInitialized"
          @update:table-data="$emit('table-updated')"
          @error="$emit('error', $event)"
        />

        <ScheduleParameterHandling
          v-if="!isLoading"
          ref="parameterComponent"
          :schedule-data="scheduleData"
          :custom-parameters="customParameters"
          :selected-parent-categories="selectedParentCategories"
          :selected-child-categories="selectedChildCategories"
          :available-headers="processedHeaders"
          :is-initialized="isInitialized"
          @update:parameter-columns="$emit('update:parameter-columns')"
          @update:evaluated-data="$emit('update:evaluated-data')"
          @update:merged-parent-parameters="$emit('update:merged-parent-parameters')"
          @update:merged-child-parameters="$emit('update:merged-child-parameters')"
          @error="$emit('error', $event)"
        />

        <ScheduleColumnManagement
          v-if="!isLoading"
          ref="columnComponent"
          :current-table-columns="parentVisibleColumns"
          :current-detail-columns="childVisibleColumns"
          :parameter-columns="parentBaseColumns"
          :is-initialized="isInitialized"
          @update:merged-table-columns="$emit('update:merged-table-columns')"
          @update:merged-detail-columns="$emit('update:merged-detail-columns')"
          @column-visibility-change="$emit('column-visibility-change')"
          @column-order-change="$emit('column-order-change')"
          @error="$emit('error', $event)"
        />

        <ScheduleParameterManagerModal
          v-if="showParameterManager"
          :show="showParameterManager"
          :table-id="currentTableId"
          @update:show="$emit('update:show-parameter-manager', $event)"
          @update="$emit('parameter-update')"
          @update:visibility="$emit('parameter-visibility-update')"
          @update:order="$emit('parameter-order-update')"
        />

        <DebugPanel
          :schedule-data="scheduleData"
          :evaluated-data="evaluatedData"
          :table-data="tableData"
          :parent-elements="parentElements"
          :child-elements="childElements"
          :parent-parameter-columns="parentAvailableColumns"
          :child-parameter-columns="childAvailableColumns"
          :available-parent-headers="availableParentHeaders"
          :available-child-headers="availableChildHeaders"
          :is-test-mode="isTestMode"
          @update:is-test-mode="$emit('update:is-test-mode', $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, type PropType } from 'vue'
import type { ElementData, TableRow } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import type { TableConfig } from '../types/table'
import type { CustomParameter } from '~/composables/settings/types/scheduleTypes'
import type { AvailableHeaders } from '../types/parameters'
import { ScheduleTableView } from './table'
import ScheduleDataManagement from './ScheduleDataManagement.vue'
import ScheduleParameterHandling from './ScheduleParameterHandling.vue'
import ScheduleColumnManagement from './ScheduleColumnManagement.vue'
import ScheduleParameterManagerModal from './ScheduleParameterManagerModal.vue'
import DebugPanel from '../debug/DebugPanel.vue'
import TestDataTable from './test/TestDataTable.vue'

const viewerContainer = ref<HTMLElement | null>(null)

defineProps({
  selectedTableId: {
    type: String,
    default: ''
  },
  currentTable: {
    type: Object as PropType<TableConfig | null>,
    default: null
  },
  isInitialized: {
    type: Boolean,
    required: true
  },
  tableName: {
    type: String,
    default: ''
  },
  currentTableId: {
    type: String,
    default: ''
  },
  tableKey: {
    type: String,
    default: '0'
  },
  error: {
    type: Error as PropType<Error | null>,
    default: null
  },
  parentBaseColumns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  parentAvailableColumns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  parentVisibleColumns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  childBaseColumns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  childAvailableColumns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  childVisibleColumns: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  scheduleData: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  evaluatedData: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  tableData: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isLoadingAdditionalData: {
    type: Boolean,
    default: false
  },
  hasSelectedCategories: {
    type: Boolean,
    default: false
  },
  selectedParentCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedChildCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  showParameterManager: {
    type: Boolean,
    default: false
  },
  processedHeaders: {
    type: Object as PropType<AvailableHeaders>,
    default: () => ({ parent: [], child: [] })
  },
  customParameters: {
    type: Array as PropType<CustomParameter[]>,
    default: () => []
  },
  parentElements: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  childElements: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  availableParentHeaders: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  availableChildHeaders: {
    type: Array as PropType<ColumnDef[]>,
    default: () => []
  },
  isTestMode: {
    type: Boolean,
    default: false
  }
})

defineEmits<{
  'update:both-columns': [
    updates: { parentColumns: ColumnDef[]; childColumns: ColumnDef[] }
  ]
  'table-updated': []
  'column-visibility-change': []
  'row-expand': [row: TableRow | ElementData]
  'row-collapse': [row: TableRow | ElementData]
  error: [err: Error | unknown]
  'update:parameter-columns': []
  'update:evaluated-data': []
  'update:merged-parent-parameters': []
  'update:merged-child-parameters': []
  'update:merged-table-columns': []
  'update:merged-detail-columns': []
  'column-order-change': []
  'update:show-parameter-manager': [value: boolean]
  'parameter-update': []
  'parameter-visibility-update': []
  'parameter-order-update': []
  'update:is-test-mode': [value: boolean]
}>()
</script>

<style scoped>
.viewer-container {
  position: relative;
  overflow: hidden;
}

.schedule-table-container {
  display: block;
}
</style>
