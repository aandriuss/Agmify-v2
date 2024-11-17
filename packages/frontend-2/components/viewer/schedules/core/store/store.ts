import { ref } from 'vue'
import type { StoreState } from '../types'

export const initialState: StoreState = {
  projectId: null,
  scheduleData: [],
  evaluatedData: [],
  tableData: [],
  customParameters: [],
  parameterColumns: [],
  mergedParentParameters: [],
  mergedChildParameters: [],
  processedParameters: {},
  currentTableColumns: [],
  currentDetailColumns: [],
  mergedTableColumns: [],
  mergedDetailColumns: [],
  parameterDefinitions: {},
  availableHeaders: { parent: [], child: [] },
  selectedCategories: new Set(),
  selectedParentCategories: [],
  selectedChildCategories: [],
  tablesArray: [],
  tableName: '',
  selectedTableId: '',
  currentTableId: '',
  tableKey: '',
  initialized: false,
  loading: false,
  error: null
}

export const state = ref<StoreState>(initialState)
