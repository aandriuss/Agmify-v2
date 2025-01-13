<template>
  <div class="viewer-container">
    <!-- Debug Info -->
    <div v-if="debug.isEnabled.value" class="mb-2 p-2 bg-gray-100">
      <pre class="text-xs">{{ debugInfo }}</pre>
    </div>

    <!-- Data Table -->
    <BaseDataTable
      :table-id="tableStore.computed.currentTable.value?.id || ''"
      :table-name="tableStore.computed.currentTable.value?.name || ''"
      :data="tableData"
      :columns="parentColumns"
      :detail-columns="childColumns"
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
      :parent-columns="parentColumns"
      :child-columns="childColumns"
      :show-parameter-stats="true"
      :show-bim-data="true"
      :show-parameter-categories="true"
      :show-table-categories="true"
      @update:is-test-mode="handleTestModeUpdate"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDebug, DebugCategories } from '~/composables/core/utils/debug'
import { useStore } from '~/composables/core/store'
import { useTableStore } from '~/composables/core/tables/store/store'
import { useParameterStore } from '~/composables/core/parameters/store'
import type {
  ElementData,
  TableColumn,
  ElementParameter
} from '~/composables/core/types'
import { isEquationValue } from '~/composables/core/types'
import BaseDataTable from '~/components/core/tables/BaseDataTable.vue'
import DebugPanel from '~/components/core/debug/DebugPanel.vue'

// Emits with type safety
const emit = defineEmits<{
  (e: 'error', payload: { error: Error }): void
  (e: 'table-updated'): void
  (
    e: 'column-visibility-change',
    payload: { column: TableColumn; visible: boolean }
  ): void
}>()

// Initialize stores
const debug = useDebug()
const store = useStore()
const tableStore = useTableStore()
const parameterStore = useParameterStore()

// Update column fields to use nested parameter paths
function updateColumnFields(): void {
  if (!currentTable.value) return

  const recreateColumns = (columns: TableColumn[]) => {
    return columns.map((col) => ({
      ...col,
      field:
        col.parameter.metadata?.isSystem &&
        ['id', 'category'].includes(col.parameter.name.toLowerCase())
          ? col.parameter.name.toLowerCase()
          : `parameters.${col.parameter.name}.value`
    }))
  }

  const updatedParentColumns = recreateColumns(currentTable.value.parentColumns)
  const updatedChildColumns = recreateColumns(currentTable.value.childColumns)

  tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
}

// Update column fields when component is mounted
onMounted(() => {
  updateColumnFields()
})

// Column management
const currentTable = computed(() => tableStore.computed.currentTable.value)
const parentColumns = computed(() => currentTable.value?.parentColumns || [])
const childColumns = computed(() => currentTable.value?.childColumns || [])

// Category filtering
const selectedParentCategories = computed(
  () =>
    tableStore.computed.currentTable.value?.categoryFilters.selectedParentCategories ||
    []
)

const selectedChildCategories = computed(
  () =>
    tableStore.computed.currentTable.value?.categoryFilters.selectedChildCategories ||
    []
)

// Element filtering
const parentElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => el.metadata?.isParent)
})

const childElements = computed<ElementData[]>(() => {
  return (store.scheduleData.value || []).filter((el) => !el.metadata?.isParent)
})

// Data table structure
const tableData = computed(() => {
  const scheduleData = store.scheduleData.value || []
  const hasParentCategories = selectedParentCategories.value.length > 0
  const hasChildCategories = selectedChildCategories.value.length > 0

  // Case 1: No categories selected -> show all elements
  if (!hasParentCategories && !hasChildCategories) {
    return scheduleData
  }

  // Case 2: Only child categories -> show filtered children as ungrouped
  if (!hasParentCategories && hasChildCategories) {
    const filteredChildren = childElements.value.filter(
      (el) => el.category && selectedChildCategories.value.includes(el.category)
    )

    return [
      {
        details: filteredChildren,
        type: 'ungrouped',
        parameters: {} as Record<string, ElementParameter>,
        metadata: { isParent: true } as Record<string, unknown>,
        _visible: true,
        id: '__ungrouped',
        name: 'Ungrouped',
        field: '__ungrouped',
        header: 'Ungrouped',
        visible: true,
        order: 0,
        removable: false,
        description: 'Elements without parent'
      }
    ]
  }

  // Case 3: Only parent categories -> show filtered parents
  if (hasParentCategories && !hasChildCategories) {
    return parentElements.value
      .filter(
        (el) => el.category && selectedParentCategories.value.includes(el.category)
      )
      .map((parent) => ({
        ...parent,
        details: []
      }))
  }

  // Case 4: Both categories -> show filtered parents with nested filtered children
  const filteredParents = parentElements.value.filter(
    (el) => el.category && selectedParentCategories.value.includes(el.category)
  )

  const filteredChildren = childElements.value.filter(
    (el) => el.category && selectedChildCategories.value.includes(el.category)
  )

  const childrenByParent = new Map<string, ElementData[]>()
  const ungroupedChildren: ElementData[] = []

  // Group children by parent
  filteredChildren.forEach((child) => {
    let matched = false

    // Get host parameter value, trying both 'host' and 'Host'
    const hostParam = (child.parameters?.['Host'] || child.parameters?.['host']) as
      | ElementParameter
      | undefined
    let hostValue: string | undefined

    // Extract host value if it exists
    if (hostParam) {
      if (isEquationValue(hostParam)) {
        // For equation values, only use if computed exists and is non-empty
        const computed = hostParam.computed
        if (
          computed !== undefined &&
          computed !== null &&
          String(computed).trim() !== ''
        ) {
          hostValue = String(computed)
        }
      } else {
        // For regular values, check both value property and direct value
        const value = hostParam.value !== undefined ? hostParam.value : hostParam
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          hostValue = String(value)
        }
      }
    }

    // Only attempt matching if we have a non-empty host value
    if (hostValue) {
      // Find all parents with matching mark value
      const matchingParents = filteredParents.filter((parent) => {
        // Get mark parameter value, trying both 'mark' and 'Mark'
        const markParam = (parent.parameters?.['Mark'] ||
          parent.parameters?.['mark']) as ElementParameter | undefined
        if (!markParam) return false

        let markValue: string | undefined

        // Extract mark value if it exists
        if (markParam) {
          if (isEquationValue(markParam)) {
            // For equation values, only use if computed exists and is non-empty
            const computed = markParam.computed
            if (
              computed !== undefined &&
              computed !== null &&
              String(computed).trim() !== ''
            ) {
              markValue = String(computed)
            }
          } else {
            // For regular values, check both value property and direct value
            const value = markParam.value !== undefined ? markParam.value : markParam
            if (value !== undefined && value !== null && String(value).trim() !== '') {
              markValue = String(value)
            }
          }
        }

        // Only match if we have a non-empty mark value
        if (markValue) {
          // Debug log to help diagnose matching issues
          debug.log(DebugCategories.DATA, 'Comparing values:', {
            hostValue,
            markValue,
            matched: markValue === hostValue
          })

          return markValue === hostValue
        }
        return false
      })

      // If we found exactly one matching parent, add the child to its group
      if (matchingParents.length === 1) {
        const matchingParent = matchingParents[0]
        if (typeof matchingParent.id === 'string') {
          const children = childrenByParent.get(matchingParent.id) || []
          children.push(child)
          childrenByParent.set(matchingParent.id, children)
          matched = true
        }
      }
      // If we found multiple matching parents or no matching parents,
      // the child should go to ungrouped to avoid ambiguity
    }

    if (!matched) {
      ungroupedChildren.push(child)
    }
  })

  // Create result with parents and their children
  const result = filteredParents.map((parent) => ({
    ...parent,
    details: typeof parent.id === 'string' ? childrenByParent.get(parent.id) || [] : []
  }))

  // Add ungrouped section if needed
  if (ungroupedChildren.length > 0) {
    result.push({
      details: ungroupedChildren,
      type: 'ungrouped',
      parameters: {} as Record<string, ElementParameter>,
      metadata: { isParent: true } as Record<string, unknown>,
      _visible: true,
      id: '__ungrouped',
      name: 'Ungrouped',
      field: '__ungrouped',
      header: 'Ungrouped',
      visible: true,
      order: result.length,
      removable: false,
      description: 'Elements without parent'
    })
  }

  debug.log(DebugCategories.DATA, 'Table data updated', {
    selectedCategories: {
      parent: selectedParentCategories.value,
      child: selectedChildCategories.value
    },
    elementCounts: {
      allParents: parentElements.value.length,
      allChildren: childElements.value.length,
      filteredParents: filteredParents.length,
      filteredChildren: filteredChildren.length,
      ungrouped: ungroupedChildren.length
    }
  })

  return result
})

// Debug info computed property
const debugInfo = computed(() => ({
  tableId: tableStore.computed.currentTable.value?.id,
  tableName: tableStore.computed.currentTable.value?.name,
  dataLength: tableData.value?.length || 0,
  parentColumnsLength: parentColumns.value?.length || 0,
  childColumnsLength: childColumns.value?.length || 0,
  selectedCategories: {
    parent: selectedParentCategories.value,
    child: selectedChildCategories.value
  },
  // filteredCounts: {
  //   parents: filteredParentElements.value.length,
  //   children: filteredChildElements.value.length
  // },
  error: error.value?.message
}))

const isInitialized = computed(() => {
  const storesReady =
    store.initialized.value &&
    parameterStore.state.value.initialized &&
    tableStore.computed.currentTable.value !== null

  const hasData = (store.scheduleData.value?.length ?? 0) > 0
  const hasColumns = parentColumns.value?.length > 0 || childColumns.value?.length > 0

  return storesReady && hasData && hasColumns
})

const hasData = computed(() => isInitialized.value)

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

async function handleColumnVisibilityChange(event: {
  column: TableColumn
  visible: boolean
}): Promise<void> {
  try {
    if (!currentTable.value) return

    const updatedParentColumns = [...currentTable.value.parentColumns]
    const updatedChildColumns = [...currentTable.value.childColumns]

    const isParentColumn = updatedParentColumns.some(
      (col) => col.id === event.column.id
    )
    if (isParentColumn) {
      const index = updatedParentColumns.findIndex((col) => col.id === event.column.id)
      if (index !== -1) {
        updatedParentColumns[index] = {
          ...updatedParentColumns[index],
          visible: event.visible
        }
      }
    } else {
      const index = updatedChildColumns.findIndex((col) => col.id === event.column.id)
      if (index !== -1) {
        updatedChildColumns[index] = {
          ...updatedChildColumns[index],
          visible: event.visible
        }
      }
    }

    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
  } catch (err) {
    handleError(err)
  }
}

async function handleColumnReorder(event: {
  dragIndex: number
  dropIndex: number
}): Promise<void> {
  try {
    const currentTable = tableStore.computed.currentTable.value
    if (!currentTable) return

    // Determine if we're reordering parent or child columns
    const draggedColumn = [...parentColumns.value, ...childColumns.value][
      event.dragIndex
    ]
    const isParentColumn = parentColumns.value.some(
      (col) => col.id === draggedColumn.id
    )

    const updatedParentColumns = [...parentColumns.value]
    const updatedChildColumns = [...childColumns.value]

    if (isParentColumn) {
      const [movedColumn] = updatedParentColumns.splice(event.dragIndex, 1)
      updatedParentColumns.splice(event.dropIndex, 0, movedColumn)
    } else {
      // Adjust index for child columns since they come after parent columns
      const childDragIndex = event.dragIndex - parentColumns.value.length
      const childDropIndex = event.dropIndex - parentColumns.value.length
      const [movedColumn] = updatedChildColumns.splice(childDragIndex, 1)
      updatedChildColumns.splice(childDropIndex, 0, movedColumn)
    }

    await tableStore.updateColumns(updatedParentColumns, updatedChildColumns)
    emit('table-updated')

    debug.log(DebugCategories.TABLE_UPDATES, 'Column reordered', {
      dragIndex: event.dragIndex,
      dropIndex: event.dropIndex,
      isParentColumn,
      parentColumnsCount: updatedParentColumns.length,
      childColumnsCount: updatedChildColumns.length
    })
  } catch (err) {
    handleError(err)
  }
}

function handleColumnResize(event: { element: HTMLElement; delta: number }): void {
  debug.log(DebugCategories.TABLE_UPDATES, 'Column resized', {
    elementId: event.element.id,
    delta: event.delta
  })
}

function handleRowExpand(event: { data: ElementData }): void {
  debug.log(DebugCategories.TABLE_UPDATES, 'Row expanded', {
    elementId: event.data.id,
    elementType: event.data.type
  })
}

function handleRowCollapse(event: { data: ElementData }): void {
  debug.log(DebugCategories.TABLE_UPDATES, 'Row collapsed', {
    elementId: event.data.id,
    elementType: event.data.type
  })
}

function handleRetry(): void {
  debug.log(DebugCategories.TABLE_UPDATES, 'Retry requested')
  // Implement retry logic if needed
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
