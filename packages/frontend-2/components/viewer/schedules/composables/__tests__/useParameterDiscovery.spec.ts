import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useParameterDiscovery } from '../useParameterDiscovery'
import type { TreeItemComponentModel, BIMNodeRaw } from '../../types'
import { DebugCategories } from '../../debug/useDebug'

describe('useParameterDiscovery', () => {
  // Mock data
  const mockBIMNodeRaw: BIMNodeRaw = {
    id: '1',
    type: 'Wall',
    Other: {
      Category: 'Walls'
    },
    Dimensions: {
      Width: 200,
      Height: 300,
      SubGroup: {
        Depth: 150
      }
    },
    Graphics: {
      Color: 'red',
      Pattern: {
        Type: 'solid',
        Scale: 1.0
      }
    },
    parameters: {
      'Custom Param': 'value',
      Group1: {
        Param1: 'value1',
        Param2: 'value2'
      }
    }
  }

  const createMockTreeItem = (raw: BIMNodeRaw): TreeItemComponentModel => ({
    id: raw.id,
    label: raw.type || '',
    rawNode: { raw },
    children: []
  })

  // Test cases
  it('discovers parameters at any level in the data', async () => {
    const { discoverParameters, availableParentHeaders } = useParameterDiscovery({
      selectedParentCategories: ref(['Walls']),
      selectedChildCategories: ref([])
    })

    await discoverParameters(createMockTreeItem(mockBIMNodeRaw))

    // Check top-level parameters
    expect(availableParentHeaders.value.some((p) => p.field === 'type')).toBe(true)

    // Check nested parameters
    expect(
      availableParentHeaders.value.some(
        (p) => p.field === 'width' && p.source === 'Dimensions'
      )
    ).toBe(true)
    expect(
      availableParentHeaders.value.some(
        (p) => p.field === 'depth' && p.source === 'Dimensions > SubGroup'
      )
    ).toBe(true)
    expect(
      availableParentHeaders.value.some(
        (p) => p.field === 'type' && p.source === 'Graphics > Pattern'
      )
    ).toBe(true)
  })

  it('preserves parameter groups and sources', async () => {
    const { discoverParameters, availableParentHeaders } = useParameterDiscovery({
      selectedParentCategories: ref(['Walls']),
      selectedChildCategories: ref([])
    })

    await discoverParameters(createMockTreeItem(mockBIMNodeRaw))

    // Check group preservation
    const dimensionsParams = availableParentHeaders.value.filter(
      (p) => p.source === 'Dimensions'
    )
    const graphicsParams = availableParentHeaders.value.filter(
      (p) => p.source === 'Graphics'
    )
    const customParams = availableParentHeaders.value.filter(
      (p) => p.source === 'Parameters'
    )

    expect(dimensionsParams.length).toBeGreaterThan(0)
    expect(graphicsParams.length).toBeGreaterThan(0)
    expect(customParams.length).toBeGreaterThan(0)

    // Check source paths are preserved
    expect(
      availableParentHeaders.value.find(
        (p) => p.field === 'depth' && p.source === 'Dimensions > SubGroup'
      )
    ).toBeTruthy()
    expect(
      availableParentHeaders.value.find(
        (p) => p.field === 'type' && p.source === 'Graphics > Pattern'
      )
    ).toBeTruthy()
  })

  it('handles both parent and child categories', async () => {
    const { discoverParameters, availableParentHeaders, availableChildHeaders } =
      useParameterDiscovery({
        selectedParentCategories: ref(['Walls']),
        selectedChildCategories: ref(['Windows'])
      })

    const mockWindowNode: BIMNodeRaw = {
      id: '2',
      type: 'Window',
      Other: {
        Category: 'Windows'
      },
      Dimensions: {
        Width: 100,
        Height: 150
      }
    }

    const rootNode = createMockTreeItem(mockBIMNodeRaw)
    rootNode.children = [createMockTreeItem(mockWindowNode)]

    await discoverParameters(rootNode)

    // Check parent parameters
    expect(availableParentHeaders.value.some((p) => p.field === 'width')).toBe(true)
    expect(availableParentHeaders.value[0].category).toBe('Walls')

    // Check child parameters
    expect(availableChildHeaders.value.some((p) => p.field === 'width')).toBe(true)
    expect(availableChildHeaders.value[0].category).toBe('Windows')
  })

  it('processes parameters in chunks', async () => {
    type DebugLogCall = [DebugCategories, string, Record<string, unknown>]
    const mockLog = vi.fn<DebugLogCall, void>()
    const mockStartState = vi.fn()
    const mockCompleteState = vi.fn()
    const mockError = vi.fn()

    const mockDebug = {
      log: mockLog,
      startState: mockStartState,
      completeState: mockCompleteState,
      error: mockError
    }

    vi.stubGlobal('debug', mockDebug)

    const { discoverParameters } = useParameterDiscovery({
      selectedParentCategories: ref(['Walls']),
      selectedChildCategories: ref([])
    })

    // Create a large number of elements
    const rootNode = createMockTreeItem(mockBIMNodeRaw)
    rootNode.children = Array.from({ length: 100 }, (_, i) =>
      createMockTreeItem({
        ...mockBIMNodeRaw,
        id: `wall-${i}`,
        parameters: {
          [`param-${i}`]: `value-${i}`
        }
      })
    )

    await discoverParameters(rootNode)

    // Check that progress was logged multiple times
    const progressLogCalls = mockLog.mock.calls.filter(
      (call: DebugLogCall) =>
        call[0] === DebugCategories.PARAMETERS &&
        call[1].includes('Parameter discovery progress')
    )
    expect(progressLogCalls.length).toBeGreaterThan(1)

    vi.unstubAllGlobals()
  })

  it('handles empty or invalid data gracefully', async () => {
    const { discoverParameters, availableParentHeaders } = useParameterDiscovery({
      selectedParentCategories: ref(['Walls']),
      selectedChildCategories: ref([])
    })

    const emptyNode = createMockTreeItem({
      id: '1',
      type: 'Wall',
      Other: {
        Category: 'Walls'
      }
    })

    await discoverParameters(emptyNode)

    // Should still have basic parameters
    expect(availableParentHeaders.value.length).toBeGreaterThan(0)
    expect(availableParentHeaders.value.some((p) => p.field === 'type')).toBe(true)
  })
})
