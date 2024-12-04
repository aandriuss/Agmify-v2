import { ref } from 'vue'
import type { StoreState } from '~/composables/core/types'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../../config/defaultColumns'

export const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  customParameters: [],
  parameterColumns: [],
  parentParameterColumns: [],
  childParameterColumns: [],
  mergedParentParameters: [],
  mergedChildParameters: [],
  processedParameters: {},
  // Initialize with default columns
  currentTableColumns: [...defaultColumns],
  currentDetailColumns: [...defaultDetailColumns],
  mergedTableColumns: [...defaultColumns],
  mergedDetailColumns: [...defaultDetailColumns],
  parameterDefinitions: {},
  availableHeaders: { parent: [], child: [] },
  selectedCategories: new Set(),
  // Initialize with default categories
  selectedParentCategories: [...defaultTable.categoryFilters.selectedParentCategories],
  selectedChildCategories: [...defaultTable.categoryFilters.selectedChildCategories],
  tablesArray: [],
  tableName: defaultTable.name,
  selectedTableId: defaultTable.id,
  currentTableId: defaultTable.id,
  tableKey: '0',
  initialized: false,
  loading: false,
  error: null
}

export const state = ref<StoreState>(initialState)
