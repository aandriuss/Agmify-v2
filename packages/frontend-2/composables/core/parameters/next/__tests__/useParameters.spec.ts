import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import { useParameters } from '../../useParameters'
import { useParameterStore } from '../store/parameter-store'
import type { UserValueType } from '~/composables/core/types/parameters'

// Create initial collections for mock
const initialCollections = {
  parent: {
    raw: [],
    available: {
      bim: [],
      user: []
    },
    selected: [],
    columns: []
  },
  child: {
    raw: [],
    available: {
      bim: [],
      user: []
    },
    selected: [],
    columns: []
  }
}

// Create a properly typed mock store
const createMockStore = () => ({
  // State
  state: computed(() => ({
    collections: initialCollections,
    loading: false,
    error: null,
    isProcessing: false,
    lastUpdated: Date.now()
  })),

  // Collections
  parentCollections: computed(() => initialCollections.parent),
  childCollections: computed(() => initialCollections.child),

  // Parent parameters
  parentRawParameters: computed(() => initialCollections.parent.raw),
  parentAvailableBimParameters: computed(() => initialCollections.parent.available.bim),
  parentAvailableUserParameters: computed(
    () => initialCollections.parent.available.user
  ),
  parentSelectedParameters: computed(() => initialCollections.parent.selected),
  parentColumnDefinitions: computed(() => initialCollections.parent.columns),

  // Child parameters
  childRawParameters: computed(() => initialCollections.child.raw),
  childAvailableBimParameters: computed(() => initialCollections.child.available.bim),
  childAvailableUserParameters: computed(() => initialCollections.child.available.user),
  childSelectedParameters: computed(() => initialCollections.child.selected),
  childColumnDefinitions: computed(() => initialCollections.child.columns),

  // Status
  isLoading: computed(() => false),
  isProcessing: computed(() => false),
  error: computed(() => null),
  hasError: computed(() => false),
  lastUpdated: computed(() => Date.now()),

  // Methods
  processRawParameters: vi.fn(),
  updateSelectedParameters: vi.fn(),
  updateColumnDefinitions: vi.fn(),
  addUserParameter: vi.fn(),
  removeParameter: vi.fn(),
  reorderParameters: vi.fn(),
  setRawParameters: vi.fn(),
  setAvailableBimParameters: vi.fn(),
  setAvailableUserParameters: vi.fn(),
  setSelectedParameters: vi.fn(),
  setColumnDefinitions: vi.fn(),
  updateParameterVisibility: vi.fn(),
  updateParameterOrder: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  reset: vi.fn()
})

// Type the mock store
type MockStore = ReturnType<typeof createMockStore>

// Mock the parameter store module
vi.mock('../store/parameter-store', () => ({
  useParameterStore: vi.fn()
}))

describe('useParameters', () => {
  const parentCategories = ['Wall']
  const childCategories = ['Window']

  const mockOptions = {
    selectedParentCategories: computed(() => parentCategories),
    selectedChildCategories: computed(() => childCategories)
  }

  let parameters: ReturnType<typeof useParameters>
  let mockStore: MockStore

  beforeEach(() => {
    // Create a new mock store for each test
    mockStore = createMockStore()
    vi.mocked(useParameterStore).mockImplementation(() => mockStore)
    parameters = useParameters(mockOptions)
  })

  describe('User Parameter Management', () => {
    it('should add user parameter', () => {
      // Add user parameter
      parameters.addUserParameter({
        isParent: true,
        name: 'Total Area',
        type: 'equation' as UserValueType,
        group: 'Calculations',
        initialValue: '[Height] * [Width]'
      })

      // Verify store method was called
      expect(mockStore.addUserParameter).toHaveBeenCalledWith(
        true,
        'Total Area',
        'equation',
        'Calculations',
        expect.any(String)
      )
    })

    it('should remove parameter', () => {
      // Remove parameter
      parameters.removeParameter('param1', true)

      // Verify store method was called
      expect(mockStore.removeParameter).toHaveBeenCalledWith(true, 'param1')
    })
  })

  describe('Parameter Visibility and Order', () => {
    it('should update parameter visibility', () => {
      // Update visibility
      parameters.updateParameterVisibility('param1', false, true)

      // Verify store method was called
      expect(mockStore.updateParameterVisibility).toHaveBeenCalledWith(
        'param1',
        false,
        true
      )
    })

    it('should update parameter order', () => {
      // Update order
      parameters.updateParameterOrder('param1', 2, true)

      // Verify store method was called
      expect(mockStore.updateParameterOrder).toHaveBeenCalledWith('param1', 2, true)
    })
  })

  describe('Category Changes', () => {
    it('should handle category changes', () => {
      // Initial categories should be set
      expect(mockOptions.selectedParentCategories.value).toEqual(['Wall'])
      expect(mockOptions.selectedChildCategories.value).toEqual(['Window'])

      // Update categories
      parentCategories.splice(0, parentCategories.length, 'Floor')
      childCategories.splice(0, childCategories.length, 'Door')

      // New categories should be reflected
      expect(mockOptions.selectedParentCategories.value).toEqual(['Floor'])
      expect(mockOptions.selectedChildCategories.value).toEqual(['Door'])
    })
  })
})
