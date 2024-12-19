import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import { useElementsData } from '../useElementsData'
import { useParameterStore } from '~/composables/core/parameters/store'
import { useBIMElements } from '../useBIMElements'
import { useStore } from '~/composables/core/store'
import type { ElementData, Store } from '~/composables/core/types'
import type { ParameterStore } from '~/composables/core/parameters/store'

// Mock dependencies
vi.mock('~/composables/core/parameters/store', () => ({
  useParameterStore: vi.fn()
}))

vi.mock('../useBIMElements', () => ({
  useBIMElements: vi.fn()
}))

vi.mock('~/composables/core/store', () => ({
  useStore: vi.fn()
}))

// Mock data
const mockElements: ElementData[] = [
  {
    id: 'wall1',
    name: 'Wall-1',
    type: 'Wall',
    category: 'Wall',
    isChild: false,
    parameters: {
      'Identity Data.Mark': 'W1',
      'Dimensions.Height': 3000,
      Material: 'Concrete'
    },
    metadata: {},
    field: 'wall1',
    header: 'Wall',
    visible: true,
    removable: true,
    details: []
  },
  {
    id: 'window1',
    name: 'Window-1',
    type: 'Window',
    category: 'Window',
    isChild: true,
    host: 'wall1',
    parameters: {
      'Identity Data.Mark': 'WIN1',
      'Dimensions.Width': 1200,
      Material: 'Glass'
    },
    metadata: {},
    field: 'window1',
    header: 'Window',
    visible: true,
    removable: true,
    details: []
  }
]

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

describe('useElementsData', () => {
  const parentCategories = ['Wall']
  const childCategories = ['Window']

  const mockOptions = {
    selectedParentCategories: computed(() => parentCategories),
    selectedChildCategories: computed(() => childCategories)
  }

  // Create mock store implementations
  const mockParameterStore = {
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
    parentAvailableBimParameters: computed(
      () => initialCollections.parent.available.bim
    ),
    parentAvailableUserParameters: computed(
      () => initialCollections.parent.available.user
    ),
    parentSelectedParameters: computed(() => initialCollections.parent.selected),
    parentColumnDefinitions: computed(() => initialCollections.parent.columns),

    // Child parameters
    childRawParameters: computed(() => initialCollections.child.raw),
    childAvailableBimParameters: computed(() => initialCollections.child.available.bim),
    childAvailableUserParameters: computed(
      () => initialCollections.child.available.user
    ),
    childSelectedParameters: computed(() => initialCollections.child.selected),
    childColumnDefinitions: computed(() => initialCollections.child.columns),

    // Status
    isLoading: computed(() => false),
    isProcessing: computed(() => false),
    error: computed(() => null),
    hasError: computed(() => false),
    lastUpdated: computed(() => Date.now()),

    // Methods
    setRawParameters: vi.fn(),
    processRawParameters: vi.fn(),
    updateSelectedParameters: vi.fn(),
    updateColumnDefinitions: vi.fn(),
    addUserParameter: vi.fn(),
    removeParameter: vi.fn(),
    reorderParameters: vi.fn(),
    setAvailableBimParameters: vi.fn(),
    setAvailableUserParameters: vi.fn(),
    setSelectedParameters: vi.fn(),
    setColumnDefinitions: vi.fn(),
    updateParameterVisibility: vi.fn(),
    updateParameterOrder: vi.fn(),
    setLoading: vi.fn(),
    setError: vi.fn(),
    reset: vi.fn()
  } satisfies ParameterStore

  const mockBIMElements = {
    allElements: computed(() => mockElements),
    allColumns: computed(() => []),
    rawWorldTree: computed(() => null),
    rawTreeNodes: computed(() => []),
    initializeElements: vi.fn(),
    isLoading: computed(() => false),
    hasError: computed(() => false),
    stopWorldTreeWatch: vi.fn()
  }

  const mockCoreStore = {
    state: computed(() => ({
      initialized: true,
      loading: false,
      error: null
    })),
    initialized: computed(() => true),
    projectId: computed(() => 'test-project'),
    scheduleData: computed(() => []),
    evaluatedData: computed(() => []),
    selectedParentCategories: computed(() => parentCategories),
    selectedChildCategories: computed(() => childCategories),
    lifecycle: {
      update: vi.fn()
    }
  } as unknown as Store

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Setup mock implementations
    vi.mocked(useParameterStore).mockImplementation(() => mockParameterStore)
    vi.mocked(useBIMElements).mockImplementation(() => mockBIMElements)
    vi.mocked(useStore).mockImplementation(() => mockCoreStore)
  })

  describe('Parameter Processing', () => {
    it('should process parameters for parent and child elements', async () => {
      const { initializeData } = useElementsData(mockOptions)
      await initializeData()

      // Type the expected parameter structure
      interface ExpectedParameter {
        id: string
        name: string
        value: unknown
        sourceGroup: string
      }

      const expectedParentParam: ExpectedParameter = {
        id: 'Identity Data.Mark',
        name: 'Mark',
        value: 'W1',
        sourceGroup: 'Identity Data'
      }

      const expectedChildParam: ExpectedParameter = {
        id: 'Identity Data.Mark',
        name: 'Mark',
        value: 'WIN1',
        sourceGroup: 'Identity Data'
      }

      // Verify parameter processing for parent elements
      const parentCall = vi
        .mocked(mockParameterStore.setRawParameters)
        .mock.calls.find(([, isParent]) => isParent === true)
      expect(parentCall?.[0]).toEqual(
        expect.arrayContaining([expect.objectContaining(expectedParentParam)])
      )

      // Verify parameter processing for child elements
      const childCall = vi
        .mocked(mockParameterStore.setRawParameters)
        .mock.calls.find(([, isParent]) => isParent === false)
      expect(childCall?.[0]).toEqual(
        expect.arrayContaining([expect.objectContaining(expectedChildParam)])
      )

      // Verify parameter store updates
      expect(mockParameterStore.processRawParameters).toHaveBeenCalledTimes(2)
      expect(mockParameterStore.updateSelectedParameters).toHaveBeenCalledTimes(2)
      expect(mockParameterStore.updateColumnDefinitions).toHaveBeenCalledTimes(2)
    })

    it('should handle parameter groups correctly', async () => {
      const { initializeData } = useElementsData(mockOptions)
      await initializeData()

      interface GroupParameter {
        sourceGroup: string
      }

      const identityDataGroup: GroupParameter = {
        sourceGroup: 'Identity Data'
      }

      const dimensionsGroup: GroupParameter = {
        sourceGroup: 'Dimensions'
      }

      // Get all setRawParameters calls
      const calls = vi.mocked(mockParameterStore.setRawParameters).mock.calls

      // Verify Identity Data group parameters
      expect(
        calls.some(([params]) =>
          params.some((param) => param.sourceGroup === identityDataGroup.sourceGroup)
        )
      ).toBe(true)

      // Verify Dimensions group parameters
      expect(
        calls.some(([params]) =>
          params.some((param) => param.sourceGroup === dimensionsGroup.sourceGroup)
        )
      ).toBe(true)
    })

    it('should update store with processed data', async () => {
      const { initializeData } = useElementsData(mockOptions)
      await initializeData()

      interface StoreUpdate {
        scheduleData: ElementData[]
        tableData: ElementData[]
      }

      const updateCall = vi.mocked(mockCoreStore.lifecycle.update).mock
        .calls[0]?.[0] as StoreUpdate
      expect(updateCall).toBeDefined()
      expect(Array.isArray(updateCall.scheduleData)).toBe(true)
      expect(Array.isArray(updateCall.tableData)).toBe(true)
    })
  })

  describe('Category Filtering', () => {
    it('should filter elements by category', async () => {
      const { scheduleData, initializeData } = useElementsData(mockOptions)
      await initializeData()

      // Parent elements should only include Walls
      const parents = scheduleData.value.filter((el) => !el.isChild)
      expect(parents).toHaveLength(1)
      expect(parents[0].category).toBe('Wall')

      // Child elements should only include Windows
      const children = scheduleData.value.filter((el) => el.isChild)
      expect(children).toHaveLength(1)
      expect(children[0].category).toBe('Window')
    })
  })

  describe('Error Handling', () => {
    it('should handle initialization errors', async () => {
      // Mock error in BIM elements initialization
      mockBIMElements.initializeElements.mockRejectedValueOnce(
        new Error('Failed to initialize')
      )

      const { initializeData, state } = useElementsData(mockOptions)
      await expect(initializeData()).rejects.toThrow('Failed to initialize')

      expect(state.value?.error).toBeTruthy()
    })
  })
})
