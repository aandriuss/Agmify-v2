import { ref, computed } from 'vue'
import type { TableColumn } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

interface ColumnState {
  parentBaseColumns: TableColumn[]
  parentAvailableColumns: TableColumn[]
  parentVisibleColumns: TableColumn[]
  childBaseColumns: TableColumn[]
  childAvailableColumns: TableColumn[]
  childVisibleColumns: TableColumn[]
}

const initialState: ColumnState = {
  parentBaseColumns: [],
  parentAvailableColumns: [],
  parentVisibleColumns: [],
  childBaseColumns: [],
  childAvailableColumns: [],
  childVisibleColumns: []
}

export function useColumns() {
  const state = ref<ColumnState>(initialState)

  const parentBaseColumns = computed(() => state.value.parentBaseColumns)
  const parentAvailableColumns = computed(() => state.value.parentAvailableColumns)
  const parentVisibleColumns = computed(() => state.value.parentVisibleColumns)
  const childBaseColumns = computed(() => state.value.childBaseColumns)
  const childAvailableColumns = computed(() => state.value.childAvailableColumns)
  const childVisibleColumns = computed(() => state.value.childVisibleColumns)

  function setColumns(
    parentColumns: TableColumn[],
    childColumns: TableColumn[],
    type: 'base' | 'available' | 'visible'
  ) {
    debug.log(DebugCategories.PARAMETERS, `Setting ${type} columns`, {
      parentCount: parentColumns.length,
      childCount: childColumns.length,
      parentSample: parentColumns.slice(0, 3),
      childSample: childColumns.slice(0, 3)
    })

    if (type === 'base') {
      state.value.parentBaseColumns = parentColumns
      state.value.childBaseColumns = childColumns
    } else if (type === 'available') {
      state.value.parentAvailableColumns = parentColumns
      state.value.childAvailableColumns = childColumns
    } else {
      state.value.parentVisibleColumns = parentColumns
      state.value.childVisibleColumns = childColumns
    }
  }

  function reset() {
    state.value = { ...initialState }
  }

  return {
    // State
    parentBaseColumns,
    parentAvailableColumns,
    parentVisibleColumns,
    childBaseColumns,
    childAvailableColumns,
    childVisibleColumns,

    // Methods
    setColumns,
    reset
  }
}

export type ColumnManager = ReturnType<typeof useColumns>
