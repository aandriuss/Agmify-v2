import { ref } from 'vue'
import type { TreeItemComponentModel } from '../types'
import { debug } from '../utils/debug'

export function useScheduleInitialization() {
  const loadingError = ref<Error | null>(null)

  function initializeData(): TreeItemComponentModel[] {
    try {
      debug.startState('mockDataInit')
      debug.log('Starting data initialization')

      // Mock data matching our column structure
      const mockData: TreeItemComponentModel[] = [
        {
          rawNode: {
            raw: {
              id: '1',
              type: 'Wall',
              mark: 'W1',
              category: 'Walls',
              name: 'Wall 1',
              width: 200,
              height: 3000,
              thickness: 200,
              area: 15,
              length: 5000,
              host: '',
              comment: 'Main wall - load bearing',
              parameters: {
                'Fire Rating': '2HR',
                'Assembly Code': 'C1010'
              }
            }
          },
          children: [
            {
              rawNode: {
                raw: {
                  id: '2',
                  type: 'Door',
                  mark: 'D1',
                  category: 'Doors',
                  name: 'Door 1',
                  width: 900,
                  height: 2100,
                  thickness: 50,
                  area: 1.89,
                  length: 900,
                  host: 'W1',
                  comment: 'Entry door - fire rated',
                  parameters: {
                    'Fire Rating': '90min',
                    'Hardware Set': 'HS-01'
                  }
                }
              },
              children: []
            },
            {
              rawNode: {
                raw: {
                  id: '3',
                  type: 'Window',
                  mark: 'Win1',
                  category: 'Windows',
                  name: 'Window 1',
                  width: 1200,
                  height: 1500,
                  thickness: 100,
                  area: 1.8,
                  length: 1200,
                  host: 'W1',
                  comment: 'Double glazed window',
                  parameters: {
                    'U-Value': '1.4',
                    'Frame Type': 'Aluminum'
                  }
                }
              },
              children: []
            }
          ]
        },
        {
          rawNode: {
            raw: {
              id: '4',
              type: 'Floor',
              mark: 'F1',
              category: 'Floors',
              name: 'Floor 1',
              width: 5000,
              height: 300,
              thickness: 300,
              area: 25,
              length: 5000,
              host: '',
              comment: 'Concrete slab',
              parameters: {
                'Fire Rating': '3HR',
                'Load Capacity': '500kg/m2'
              }
            }
          },
          children: [
            {
              rawNode: {
                raw: {
                  id: '5',
                  type: 'Lighting',
                  mark: 'L1',
                  category: 'Lighting Fixtures',
                  name: 'Light 1',
                  width: 600,
                  height: 100,
                  thickness: 100,
                  area: 0.36,
                  length: 600,
                  host: 'F1',
                  comment: 'LED Panel',
                  parameters: {
                    Wattage: '40W',
                    'Color Temperature': '4000K'
                  }
                }
              },
              children: []
            }
          ]
        }
      ]

      debug.log('Mock data created:', {
        nodesCount: mockData.length,
        firstNode: mockData[0],
        firstNodeChildren: mockData[0].children,
        firstChild: mockData[0].children?.[0],
        allNodes: mockData,
        categories: new Set(mockData.map((node) => node.rawNode.raw.category)),
        childCategories: new Set(
          mockData
            .flatMap((node) => node.children || [])
            .filter((child) => child?.rawNode?.raw?.category)
            .map((child) => child.rawNode.raw.category)
        )
      })

      debug.completeState('mockDataInit')
      return mockData
    } catch (err) {
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to initialize data')
      debug.error('Initialization error:', err)
      throw loadingError.value
    }
  }

  async function waitForData<T>(
    getValue: () => T | undefined | null,
    validate: (value: T) => boolean,
    timeout = 10000
  ): Promise<T> {
    debug.startState('dataWait')
    const start = Date.now()
    let value = getValue()
    let attempts = 0

    while ((!value || !validate(value)) && Date.now() - start < timeout) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 100))
      value = getValue()

      // Log progress every second
      if (attempts % 10 === 0) {
        debug.log('Waiting for data:', {
          hasValue: !!value,
          isValid: value ? validate(value) : false,
          elapsed: Date.now() - start,
          attempts,
          remainingTime: timeout - (Date.now() - start),
          currentValue: value ? JSON.stringify(value).slice(0, 200) + '...' : 'null'
        })
      }

      // If we have a value but it's invalid, log details
      if (value && !validate(value)) {
        debug.warn('Invalid data received:', {
          value:
            typeof value === 'object'
              ? JSON.stringify(value, null, 2).slice(0, 200) + '...'
              : value,
          validationResult: validate(value)
        })
      }
    }

    if (!value || !validate(value)) {
      debug.error('Data wait timeout:', {
        hasValue: !!value,
        isValid: value ? validate(value) : false,
        elapsed: Date.now() - start,
        attempts,
        value: value ? JSON.stringify(value, null, 2).slice(0, 200) + '...' : 'null'
      })

      const error = new Error('Timeout waiting for data')
      loadingError.value = error
      debug.completeState('dataWait')
      throw error
    }

    debug.log('Data ready:', {
      elapsed: Date.now() - start,
      attempts,
      dataType: typeof value,
      isArray: Array.isArray(value),
      length: Array.isArray(value) ? value.length : null,
      value: JSON.stringify(value).slice(0, 200) + '...'
    })

    debug.completeState('dataWait')
    return value
  }

  return {
    loadingError,
    initializeData,
    waitForData
  }
}
