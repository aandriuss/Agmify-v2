import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { ref, computed } from 'vue'
import { useUnifiedParameters } from '../useUnifiedParameters'
import type { Store, ProcessedHeader, UnifiedParameter } from '../../types'
import type { CustomParameter } from '~/composables/settings/types/scheduleTypes'

describe('useUnifiedParameters', () => {
  // Mock store
  const mockStore = {
    lifecycle: {
      init: vi.fn(),
      update: vi.fn(),
      cleanup: vi.fn()
    }
  } satisfies Partial<Store>

  vi.mock('../core/store', () => ({
    useStore: () => mockStore
  }))

  // Mock data
  const mockDiscoveredHeaders = {
    parent: [
      {
        field: 'width',
        header: 'Width',
        type: 'string',
        source: 'Dimensions',
        category: 'Walls',
        description: 'Width parameter',
        isFetched: true,
        fetchedGroup: 'Dimensions',
        currentGroup: 'Dimensions'
      },
      {
        field: 'height',
        header: 'Height',
        type: 'string',
        source: 'Dimensions',
        category: 'Walls',
        description: 'Height parameter',
        isFetched: true,
        fetchedGroup: 'Dimensions',
        currentGroup: 'Dimensions'
      }
    ] satisfies ProcessedHeader[],
    child: [
      {
        field: 'width',
        header: 'Width',
        type: 'string',
        source: 'Dimensions',
        category: 'Windows',
        description: 'Width parameter',
        isFetched: true,
        fetchedGroup: 'Dimensions',
        currentGroup: 'Dimensions'
      }
    ] satisfies ProcessedHeader[]
  }

  const mockCustomParameters = [
    {
      id: 'custom1',
      name: 'Custom Fixed',
      field: 'custom_fixed',
      header: 'Custom Fixed',
      type: 'fixed' as const,
      value: '100',
      category: 'Custom Parameters',
      removable: true,
      visible: true,
      order: 0
    },
    {
      id: 'custom2',
      name: 'Custom Equation',
      field: 'custom_equation',
      header: 'Custom Equation',
      type: 'equation' as const,
      equation: 'width * 2',
      category: 'Custom Parameters',
      removable: true,
      visible: true,
      order: 1
    }
  ] satisfies CustomParameter[]

  // Helper to convert ProcessedHeader to UnifiedParameter
  function convertToUnifiedParameter(header: ProcessedHeader): UnifiedParameter {
    return {
      id: header.field,
      name: header.header,
      field: header.field,
      header: header.header,
      type: header.type === 'number' ? 'equation' : 'fixed',
      category: header.category,
      description: header.description,
      source: header.source,
      isFetched: header.isFetched,
      fetchedGroup: header.fetchedGroup,
      currentGroup: header.currentGroup,
      visible: true,
      removable: true
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('merges discovered and custom parameters', () => {
    const { parentParameters, childParameters } = useUnifiedParameters({
      discoveredParameters: computed(() => mockDiscoveredHeaders),
      customParameters: computed(() => mockCustomParameters)
    })

    // Check parent parameters
    expect(parentParameters.value).toHaveLength(
      mockDiscoveredHeaders.parent.length + mockCustomParameters.length
    )
    expect(parentParameters.value.some((p) => p.field === 'width')).toBe(true)
    expect(parentParameters.value.some((p) => p.field === 'custom_fixed')).toBe(true)

    // Check child parameters
    expect(childParameters.value).toHaveLength(
      mockDiscoveredHeaders.child.length + mockCustomParameters.length
    )
    expect(childParameters.value.some((p) => p.field === 'width')).toBe(true)
    expect(childParameters.value.some((p) => p.field === 'custom_equation')).toBe(true)
  })

  it('preserves parameter groups and sources', () => {
    const { parentParameters } = useUnifiedParameters({
      discoveredParameters: computed(() => mockDiscoveredHeaders),
      customParameters: computed(() => mockCustomParameters)
    })

    // Check discovered parameter group
    const dimensionsParam = parentParameters.value.find((p) => p.field === 'width')
    expect(dimensionsParam).toBeDefined()
    expect(dimensionsParam?.source).toBe('Dimensions')
    expect(dimensionsParam?.fetchedGroup).toBe('Dimensions')

    // Check custom parameter group
    const customParam = parentParameters.value.find((p) => p.field === 'custom_fixed')
    expect(customParam).toBeDefined()
    expect(customParam?.source).toBe('Custom Parameters')
    expect(customParam?.category).toBe('Custom Parameters')
  })

  it('updates store with unified parameters', async () => {
    const { updateStore } = useUnifiedParameters({
      discoveredParameters: computed(() => mockDiscoveredHeaders),
      customParameters: computed(() => mockCustomParameters)
    })

    await updateStore()

    // Convert mock headers to UnifiedParameters for comparison
    const expectedParentHeaders = mockDiscoveredHeaders.parent.map(
      convertToUnifiedParameter
    )
    const expectedChildHeaders = mockDiscoveredHeaders.child.map(
      convertToUnifiedParameter
    )

    const updateCall = mockStore.lifecycle.update as Mock
    const updateArg = updateCall.mock.calls[0][0]

    // Type guard for UnifiedParameter array
    function isUnifiedParameterArray(arr: unknown): arr is UnifiedParameter[] {
      return (
        Array.isArray(arr) &&
        arr.every((item): item is UnifiedParameter => {
          return (
            typeof item === 'object' &&
            item !== null &&
            'id' in item &&
            'name' in item &&
            'field' in item &&
            'header' in item &&
            'type' in item
          )
        })
      )
    }

    // Verify parent parameters
    expect(isUnifiedParameterArray(updateArg.availableHeaders.parent)).toBe(true)
    expect(updateArg.availableHeaders.parent).toEqual(
      expect.arrayContaining(expectedParentHeaders)
    )

    // Verify child parameters
    expect(isUnifiedParameterArray(updateArg.availableHeaders.child)).toBe(true)
    expect(updateArg.availableHeaders.child).toEqual(
      expect.arrayContaining(expectedChildHeaders)
    )

    // Verify column definitions
    expect(updateArg.parentAvailableColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'width' }),
        expect.objectContaining({ field: 'custom_fixed' })
      ])
    )
    expect(updateArg.childAvailableColumns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'width' }),
        expect.objectContaining({ field: 'custom_equation' })
      ])
    )
  })

  it('handles empty discovered parameters', () => {
    const { parentParameters, childParameters } = useUnifiedParameters({
      discoveredParameters: computed(() => ({ parent: [], child: [] })),
      customParameters: computed(() => mockCustomParameters)
    })

    // Should still have custom parameters
    expect(parentParameters.value).toHaveLength(mockCustomParameters.length)
    expect(childParameters.value).toHaveLength(mockCustomParameters.length)
  })

  it('handles empty custom parameters', () => {
    const { parentParameters, childParameters } = useUnifiedParameters({
      discoveredParameters: computed(() => mockDiscoveredHeaders),
      customParameters: computed(() => [])
    })

    // Should still have discovered parameters
    expect(parentParameters.value).toHaveLength(mockDiscoveredHeaders.parent.length)
    expect(childParameters.value).toHaveLength(mockDiscoveredHeaders.child.length)
  })

  it('watches for changes and updates store', async () => {
    const discoveredParams = ref(mockDiscoveredHeaders)
    const customParams = ref(mockCustomParameters)

    useUnifiedParameters({
      discoveredParameters: computed(() => discoveredParams.value),
      customParameters: computed(() => customParams.value)
    })

    // Initial update
    expect(mockStore.lifecycle.update).toHaveBeenCalledTimes(1)

    // Change discovered parameters
    discoveredParams.value = {
      parent: [
        ...mockDiscoveredHeaders.parent,
        {
          field: 'depth',
          header: 'Depth',
          type: 'string',
          source: 'Dimensions',
          category: 'Walls',
          description: 'Depth parameter',
          isFetched: true,
          fetchedGroup: 'Dimensions',
          currentGroup: 'Dimensions'
        }
      ],
      child: mockDiscoveredHeaders.child
    }

    // Wait for Vue reactivity
    await vi.dynamicImportSettled()

    // Should trigger another update
    expect(mockStore.lifecycle.update).toHaveBeenCalledTimes(2)
  })
})
