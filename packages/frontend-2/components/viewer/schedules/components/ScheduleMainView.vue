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

    <div class="schedule-table-container">
      <!-- Parameter Manager -->
      <ParameterManager
        v-if="showParameterManager"
        :selected-parent-categories="store.selectedParentCategories.value"
        :selected-child-categories="store.selectedChildCategories.value"
        :available-parent-parameters="parameterStore.parentAvailableBimParameters.value"
        :available-child-parameters="parameterStore.childAvailableBimParameters.value"
        :selected-parent-parameters="
          tableStore.currentTable.value?.selectedParameters?.parent || []
        "
        :selected-child-parameters="
          tableStore.currentTable.value?.selectedParameters?.child || []
        "
        :can-create-parameters="true"
        @parameter-visibility-change="handleParameterVisibilityChange"
        @parameter-edit="handleParameterEdit"
        @parameter-create="handleParameterCreate"
        @parameter-select="handleParameterSelect"
        @parameter-deselect="handleParameterDeselect"
        @error="handleError"
      />

      <!-- Debug Info -->
      <div v-if="debug.isEnabled.value" class="mb-2 p-2 bg-gray-100">
        <pre class="text-xs">{{
          {
            tableId: selectedTableId,
            tableName,
            dataLength: tableData?.length || 0,
            columnsLength: tableColumns?.length || 0,
            detailColumnsLength: detailColumns?.length || 0,
            error: error?.message
          }
        }}</pre>
      </div>

      <!-- Data Table -->
      <BaseDataTable
        :table-id="selectedTableId"
        :table-name="tableName"
        :data="tableData"
        :columns="tableColumns"
        :detail-columns="detailColumns"
        :loading="!hasData"
        :error="error"
        @row-expand="handleRowExpand"
        @row-collapse="handleRowCollapse"
        @column-visibility-change="handleColumnVisibilityChange"
        @column-reorder="handleColumnReorder"
        @column-resize="handleColumnResize"
        @error="handleError"
        @retry="handleRetry"
      />

      <!-- Debug Panel -->
      <DebugPanel
        v-if="debug.isEnabled.value"
        :schedule-data="store.scheduleData.value"
        :evaluated-data="store.evaluatedData.value"
        :table-data="store.tableData.value"
        :parent-elements="parentElements"
        :child-elements="childElements"
        :parent-columns="tableStore.currentTable.value?.parentColumns || []"
        :child-columns="tableStore.currentTable.value?.childColumns || []"
        :show-parameter-stats="true"
        :show-bim-data="true"
        :show-parameter-categories="true"
        :show-table-categories="true"
        @update:is-test-mode="handleTestModeUpdate"
      />
    </div>
  </TableLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import { useParameters } from '~/composables/core/parameters/useParameters'
import type {
  ElementData,
  TableSettings,
  SelectedParameter,
  AvailableParameter,
  TableColumn,
  BaseItem,
  ParameterValue
} from '~/composables/core/types'
import { createSelectedParameter, isEquationValue } from '~/composables/core/types'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import ParameterManager from '~/components/core/parameters/next/ParameterManager.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'
import TableLayout from '~/components/core/tables/TableLayout.vue'

// Initialize stores
const debug = useDebug()
const store = useStore()
const tableStore = useTableStore()
const parameterStore = useParameterStore()

// Props with destructuring for used values
const { selectedTableId, tableName, showParameterManager } = defineProps<{
  selectedTableId: string
  currentTable: TableSettings | null
  tableName: string
  showParameterManager: boolean
}>()

// Emits with type safety
const emit = defineEmits<{
  (e: 'error', payload: { error: Error }): void
  (e: 'parameter-visibility-change', payload: { parameter: SelectedParameter }): void
  (e: 'parameter-select', payload: { parameter: SelectedParameter }): void
  (e: 'parameter-deselect', payload: { parameter: AvailableParameter }): void
  (e: 'parameter-create', payload: { timestamp: number }): void
  (e: 'parameter-click', payload: { parameter: BaseItem }): void
  (
    e: 'column-visibility-change',
    payload: { column: TableColumn; visible: boolean }
  ): void
  (e: 'column-reorder', payload: { dragIndex: number; dropIndex: number }): void
  (e: 'column-resize', payload: { element: HTMLElement; delta: number }): void
  (e: 'row-expand', payload: { row: ElementData }): void
  (e: 'row-collapse', payload: { row: ElementData }): void
  (e: 'retry', payload: { timestamp: number }): void
}>()

// Initialize parameter system
const parameters = useParameters({
  selectedParentCategories: computed(() => store.selectedParentCategories.value),
  selectedChildCategories: computed(() => store.selectedChildCategories.value)
})

// Computed properties
const tableColumns = computed(() => tableStore.currentTable.value?.parentColumns || [])
const detailColumns = computed(() => tableStore.currentTable.value?.childColumns || [])
const hasSelectedCategories = computed(() => {
  const parentCats = store.selectedParentCategories.value
  const childCats = store.selectedChildCategories.value
  return (parentCats?.length ?? 0) > 0 || (childCats?.length ?? 0) > 0
})

const tableData = computed(() => {
  const scheduleData = store.scheduleData.value || []

  // If no categories selected, show all elements as a flat list
  if (!hasSelectedCategories.value) {
    return scheduleData
  }

  // If only parent categories selected, show parent elements
  if (
    (store.selectedParentCategories.value?.length ?? 0) > 0 &&
    (store.selectedChildCategories.value?.length ?? 0) === 0
  ) {
    return parentElements.value
  }

  // If parent/child relationship is needed
  const parentData = parentElements.value
  const childrenByParent = new Map<string, ElementData[]>()
  const ungroupedChildren: ElementData[] = []

  // Group children by matching mark/host parameters
  childElements.value.forEach((child) => {
    const hostParam = child.parameters?.['host'] as ParameterValue | undefined
    let hostValue: string | undefined

    if (hostParam) {
      if (isEquationValue(hostParam)) {
        // For equation values, use the computed result
        hostValue =
          hostParam.computed !== undefined ? String(hostParam.computed) : undefined
      } else {
        // For primitive values, convert directly to string
        hostValue = String(hostParam)
      }
    }

    let matched = false

    if (hostValue) {
      // Try to find parent with matching mark parameter
      const matchingParent = parentData.find((parent) => {
        const markParam = parent.parameters?.['mark'] as ParameterValue | undefined
        if (!markParam) return false

        if (isEquationValue(markParam)) {
          return markParam.computed !== undefined
            ? String(markParam.computed) === hostValue
            : false
        }
        return String(markParam) === hostValue
      })

      if (matchingParent && typeof matchingParent.id === 'string') {
        const children = childrenByParent.get(matchingParent.id) || []
        children.push(child)
        childrenByParent.set(matchingParent.id, children)
        matched = true
      }
    }

    // If no match found or no host value, add to ungrouped
    if (!matched) {
      ungroupedChildren.push(child)
    }
  })

  // Create result with both matched and ungrouped children
  const result = parentData.map((parent) => {
    // Extract all properties except details to avoid spreading undefined
    const { details: _, ...parentWithoutDetails } = parent
    return {
      ...parentWithoutDetails,
      details:
        typeof parent.id === 'string' ? childrenByParent.get(parent.id) || [] : []
    }
  })

  // Add ungrouped section if there are any ungrouped children
  if (ungroupedChildren.length > 0) {
    // Create a constant for the ungrouped section to ensure type safety
    const ungroupedSection = {
      details: ungroupedChildren,
      type: 'ungrouped',
      mark: 'Ungrouped',
      category: 'Ungrouped',
      parameters: {
        mark: 'Ungrouped'
      } as Record<string, ParameterValue>,
      metadata: { isParent: true } as Record<string, unknown>,
      _visible: true,
      id: 'ungrouped',
      name: 'Ungrouped',
      field: 'ungrouped',
      header: 'Ungrouped',
      visible: true,
      order: result.length,
      removable: false,
      description: 'Elements without matching parent'
    }
    result.push(ungroupedSection)
  }

  return result
})

const isInitialized = computed(() => {
  const storesReady =
    store.initialized.value &&
    parameterStore.state.value.initialized &&
    tableStore.currentTable.value !== null

  const hasData = (store.scheduleData.value?.length ?? 0) > 0
  const hasColumns = tableColumns.value?.length > 0 || detailColumns.value?.length > 0

  debug.log(DebugCategories.STATE, 'Initialization check:', {
    storesReady,
    hasData,
    hasColumns,
    hasCategories: hasSelectedCategories.value,
    counts: {
      total: store.scheduleData.value?.length ?? 0,
      parents: parentElements.value.length,
      children: childElements.value.length,
      parentColumns: tableColumns.value?.length ?? 0,
      childColumns: detailColumns.value?.length ?? 0
    },
    stores: {
      core: store.initialized.value,
      parameters: parameterStore.state.value.initialized,
      table: tableStore.currentTable.value !== null
    }
  })

  return storesReady && hasData && hasColumns
})

const hasData = computed(() => isInitialized.value)

const parentElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.metadata?.isParent)
})

const childElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.isChild)
})

// Error handling
const error = computed(() => {
  if (parameterStore.state.value.processing.error) {
    return parameterStore.state.value.processing.error instanceof Error
      ? parameterStore.state.value.processing.error
      : new Error('Processing error')
  }
  return null
})

// Event handlers
function handleError(err: unknown): void {
  const safeError = err instanceof Error ? err : new Error('Unknown error')
  debug.error(DebugCategories.ERROR, 'Error in schedule view:', safeError)
  emit('error', { error: safeError })
}

function handleParameterVisibilityChange(param: SelectedParameter): void {
  parameters.updateParameterVisibility(param.id, param.visible, param.kind === 'bim')
  emit('parameter-visibility-change', { parameter: param })
}

function handleColumnVisibilityChange(event: {
  column: TableColumn
  visible: boolean
}): void {
  const param = event.column.parameter as SelectedParameter | undefined
  if (param) {
    parameters.updateParameterVisibility(param.id, event.visible, param.kind === 'bim')
    emit('column-visibility-change', event)
  }
}

function handleParameterSelect(param: AvailableParameter, isParent: boolean): void {
  try {
    const currentTable = tableStore.currentTable.value
    if (!currentTable) return

    const selectedParam = createSelectedParameter(
      param,
      isParent
        ? currentTable.selectedParameters.parent.length
        : currentTable.selectedParameters.child.length
    )

    const selectedParams = {
      parent: isParent
        ? [...currentTable.selectedParameters.parent, selectedParam]
        : currentTable.selectedParameters.parent,
      child: !isParent
        ? [...currentTable.selectedParameters.child, selectedParam]
        : currentTable.selectedParameters.child
    }

    tableStore.updateSelectedParameters(selectedParams)
    emit('parameter-select', { parameter: selectedParam })
  } catch (err) {
    handleError(err)
  }
}

function handleParameterDeselect(param: AvailableParameter, isParent: boolean): void {
  try {
    const currentTable = tableStore.currentTable.value
    if (!currentTable) return

    const selectedParams = {
      parent: isParent
        ? currentTable.selectedParameters.parent.filter((p) => p.id !== param.id)
        : currentTable.selectedParameters.parent,
      child: !isParent
        ? currentTable.selectedParameters.child.filter((p) => p.id !== param.id)
        : currentTable.selectedParameters.child
    }

    tableStore.updateSelectedParameters(selectedParams)
    emit('parameter-deselect', { parameter: param })
  } catch (err) {
    handleError(err)
  }
}

function handleColumnReorder(event: { dragIndex: number; dropIndex: number }): void {
  try {
    const currentTable = tableStore.currentTable.value
    if (!currentTable) return

    const parentColumns = [...(currentTable.parentColumns || [])]
    const childColumns = [...(currentTable.childColumns || [])]

    const [movedParentColumn] = parentColumns.splice(event.dragIndex, 1)
    parentColumns.splice(event.dropIndex, 0, movedParentColumn)

    const [movedChildColumn] = childColumns.splice(event.dragIndex, 1)
    childColumns.splice(event.dropIndex, 0, movedChildColumn)

    tableStore.updateColumns(parentColumns, childColumns)
    emit('column-reorder', event)
  } catch (err) {
    handleError(err)
  }
}

function handleColumnResize(event: { element: HTMLElement; delta: number }): void {
  emit('column-resize', event)
}

function handleParameterCreate(): void {
  emit('parameter-create', { timestamp: Date.now() })
}

function handleParameterEdit(param: SelectedParameter): void {
  const baseParam: BaseItem = {
    id: param.id,
    name: param.name,
    field: param.id,
    header: param.name,
    visible: param.visible,
    removable: param.kind === 'user',
    order: param.order,
    category: param.category,
    description: param.description
  }
  emit('parameter-click', { parameter: baseParam })
}

function handleRowExpand(event: { data: ElementData }): void {
  emit('row-expand', { row: event.data })
}

function handleRowCollapse(event: { data: ElementData }): void {
  emit('row-collapse', { row: event.data })
}

function handleRetry(): void {
  emit('retry', { timestamp: Date.now() })
}

function handleTestModeUpdate(value: boolean): void {
  debug.log(DebugCategories.INITIALIZATION, 'Test mode updated:', value)
}
</script>

<style scoped>
.viewer-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.schedule-table-container {
  display: block;
  min-height: 400px;
  width: 100%;
}
</style>
