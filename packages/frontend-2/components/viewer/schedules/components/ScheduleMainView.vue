<template>
  <TableLayout class="viewer-container">
    <template #controls>
      <div class="flex items-center gap-4">
        <slot name="table-controls" />
      </div>
    </template>

    <template #actions>
      <div class="flex items-center gap-2">
        <slot name="table-actions" />
      </div>
    </template>

    <LoadingState
      :is-loading="isLoading"
      :error="error"
      loading-message="Loading schedule data..."
    >
      <div class="schedule-table-container">
        <TestDataTable v-if="isTestMode" />

        <template v-else>
          <BaseDataTable
            :table-id="selectedTableId"
            :table-name="tableName"
            :data="convertedTableData"
            :columns="parentVisibleColumns"
            :detail-columns="childVisibleColumns"
            :loading="isLoading"
            :error="error"
            @row-expand="({ row }) => events.handleRowExpand({ row })"
            @row-collapse="({ row }) => events.handleRowCollapse({ row })"
            @column-visibility-change="
              (payload) => events.handleColumnVisibilityChange(payload)
            "
            @column-reorder="(payload) => events.handleColumnReorder(payload)"
            @column-resize="(payload) => events.handleColumnResize(payload)"
            @error="({ error }) => events.handleError({ error })"
            @retry="() => events.handleRetry({ timestamp: Date.now() })"
          />

          <ParameterManager
            v-if="showParameterManager"
            :parameter-groups="parameterGroups"
            :available-categories="availableCategories"
            :selected-categories="selectedCategories"
            :can-create-parameters="true"
            :selected-parameters="selectedParameters"
            :is-loading="isLoadingAdditionalData"
            @update:selected-categories="handleCategoryUpdate"
            @parameter-click="(parameter: TableParameter) => events.handleParameterClick({ parameter })"
            @create-parameter="
              () => events.handleCreateParameter({ timestamp: Date.now() })
            "
            @edit-parameters="
              () => events.handleEditParameters({ timestamp: Date.now() })
            "
            @error="(error) => events.handleError({ error })"
            @retry="() => events.handleRetry({ timestamp: Date.now() })"
          />

          <DebugPanel
            v-if="isTestMode"
            :schedule-data="convertedScheduleData"
            :evaluated-data="evaluatedData"
            :table-data="tableData"
            :parent-elements="parentElements"
            :child-elements="childElements"
            :parent-columns="parentVisibleColumns"
            :child-columns="childVisibleColumns"
            :is-test-mode="isTestMode"
            @update:is-test-mode="(value) => events.handleTestModeUpdate({ value })"
          />
        </template>
      </div>
    </LoadingState>
  </TableLayout>
</template>

<script setup lang="ts">
import { computed, watch, type PropType } from 'vue'
import type {
  ElementData,
  TableRow,
  ColumnDef,
  TableConfig
} from '~/composables/core/types'
import type { TableParameter } from '~/composables/core/types/tables/parameter-table-types'
import { toTableParameter } from '~/composables/core/types/tables/parameter-table-types'
import type { PrimitiveValue, BimValueType } from '~/composables/core/types/parameters'
import {
  convertBimToUserType,
  createUserParameterWithDefaults
} from '~/composables/core/types/parameters'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/ParameterManager.vue'
import LoadingState from '~/components/core/LoadingState.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import TestDataTable from './test/TestDataTable.vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useElementsData } from '~/composables/core/tables/state/useElementsData'
import { useScheduleEvents } from '~/composables/core/tables/events/useScheduleEvents'
import {
  isElementData,
  isTableRow,
  toElementData
} from '~/composables/core/utils/conversion/table-conversion'
import type { TableEmits, ScheduleEmits } from '~/composables/core/types/events'

const debugInstance = useDebug()

// Define props first
const props = defineProps({
  selectedTableId: {
    type: String,
    required: true
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
    type: Array as PropType<(ElementData | TableRow)[]>,
    default: () => []
  },
  evaluatedData: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  tableData: {
    type: Array as PropType<TableRow[]>,
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
  parentElements: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  childElements: {
    type: Array as PropType<ElementData[]>,
    default: () => []
  },
  isTestMode: {
    type: Boolean,
    default: false
  },
  parameterGroups: {
    type: Object as PropType<Map<string, TableParameter[]>>,
    default: () => new Map()
  },
  availableCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedCategories: {
    type: Array as PropType<string[]>,
    default: () => []
  },
  selectedParameters: {
    type: Array as PropType<TableParameter[]>,
    default: () => []
  }
})

// Define emits with proper type
const emit = defineEmits<TableEmits<TableParameter> & ScheduleEmits<TableParameter>>()

// Initialize core functionality
const { updateCategories } = useElementsData({
  selectedParentCategories: computed(() => props.selectedParentCategories),
  selectedChildCategories: computed(() => props.selectedChildCategories)
})

// Initialize events
const events = useScheduleEvents<TableParameter>({
  onError: (error) => emit('error', { error }),
  onRetry: () => emit('retry', { timestamp: Date.now() })
})

// Convert schedule data to ElementData
const convertedScheduleData = computed<ElementData[]>(() => {
  return props.scheduleData
    .map((item) => {
      if (isElementData(item)) {
        return item
      }
      if (isTableRow(item)) {
        return toElementData(item)
      }
      // Log invalid data for debugging
      debugInstance.warn(
        DebugCategories.DATA_VALIDATION,
        'Invalid schedule data item',
        {
          item,
          type: typeof item,
          hasId: item && typeof item === 'object' && 'id' in item,
          hasType: item && typeof item === 'object' && 'type' in item
        }
      )
      // Skip invalid items instead of creating potentially meaningless defaults
      return null
    })
    .filter((item): item is ElementData => item !== null)
})

// Convert ElementData to TableParameter for BaseDataTable
const convertedTableData = computed<TableParameter[]>(() => {
  return convertedScheduleData.value.map((item) => {
    const userParam = createUserParameterWithDefaults({
      id: item.id,
      name: item.name,
      field: item.field,
      header: item.header,
      type: convertBimToUserType(item.type as BimValueType),
      group: item.category || 'default',
      value: null as PrimitiveValue,
      visible: item.visible,
      removable: item.removable,
      order: item.order,
      metadata: item.metadata
    })
    return toTableParameter(userParam)
  })
})

function handleCategoryUpdate(categories: string[]): void {
  emit('update:selected-categories', { categories })
}

// Watch for category changes
watch(
  [() => props.selectedParentCategories, () => props.selectedChildCategories],
  async ([newParentCats, newChildCats]) => {
    if (!props.isInitialized) {
      debugInstance.warn(DebugCategories.STATE, 'Waiting for initialization')
      return
    }

    try {
      await updateCategories(newParentCats, newChildCats)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      events.handleError({ error })
    }
  },
  { immediate: true }
)

// Watch for column changes
watch(
  [() => props.parentVisibleColumns, () => props.childVisibleColumns],
  ([parentCols, childCols]) => {
    if (!props.isInitialized) return

    try {
      // Update parent columns
      parentCols.forEach((col) => {
        events.handleColumnVisibilityChange({ column: col, visible: col.visible })
      })

      // Update child columns
      childCols.forEach((col) => {
        events.handleColumnVisibilityChange({ column: col, visible: col.visible })
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      events.handleError({ error })
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-table-container {
  display: block;
}
</style>
