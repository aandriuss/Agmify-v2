import { ref } from 'vue'
import type { StoreState } from '../../types'
import {
  defaultColumns,
  defaultDetailColumns,
  defaultTable
} from '../../config/defaultColumns'

// Initialize selectedCategories with all default categories
const initialSelectedCategories = new Set([
  ...defaultTable.categoryFilters.selectedParentCategories,
  ...defaultTable.categoryFilters.selectedChildCategories
])

export const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  customParameters: [],
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
  // Initialize with combined default categories
  selectedCategories: initialSelectedCategories,
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