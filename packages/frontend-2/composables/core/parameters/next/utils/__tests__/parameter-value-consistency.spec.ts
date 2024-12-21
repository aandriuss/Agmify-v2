import { describe, it, expect } from 'vitest'
import {
  extractRawParameters,
  processRawParameters,
  createSelectedParameters,
  createColumnDefinitions
} from '../../../parameter-processing'
import type { ElementData } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'

describe('Parameter Value Consistency', () => {
  describe('Value Preservation', () => {
    it('should maintain parameter values through the entire pipeline', async () => {
      // Initial element with various parameter types
      const parameters: Record<string, ParameterValue> = {
        'Identity Data.Mark': 'W1',
        'Dimensions.Height': 3000,
        'Properties.IsExternal': true,
        Material: 'Concrete',
        'Calculations.Area': {
          kind: 'equation',
          expression: '[Height] * [Width]',
          references: ['Height', 'Width'],
          resultType: 'number'
        }
      }

      const elements: ElementData[] = [
        {
          id: 'element1',
          name: 'Test Element',
          type: 'Wall',
          category: 'Walls',
          isChild: false,
          parameters,
          metadata: {},
          field: 'element1',
          header: 'Test',
          visible: true,
          removable: true,
          details: []
        }
      ]

      // Step 1: Extract raw parameters
      const rawParams = extractRawParameters(elements)
      expect(rawParams).toHaveLength(5)

      // Verify raw parameter values
      expect(rawParams).toContainEqual(
        expect.objectContaining({
          name: 'Mark',
          value: 'W1',
          sourceGroup: 'Identity Data'
        })
      )
      expect(rawParams).toContainEqual(
        expect.objectContaining({
          name: 'Height',
          value: 3000,
          sourceGroup: 'Dimensions'
        })
      )
      expect(rawParams).toContainEqual(
        expect.objectContaining({
          name: 'IsExternal',
          value: true,
          sourceGroup: 'Properties'
        })
      )

      // Step 2: Process into available parameters
      const availableParams = await processRawParameters(rawParams)
      expect(availableParams).toHaveLength(5)

      // Verify value types are correctly inferred
      const heightParam = availableParams.find((p) => p.name === 'Height')
      expect(heightParam).toMatchObject({
        type: 'number',
        value: 3000
      })

      const isExternalParam = availableParams.find((p) => p.name === 'IsExternal')
      expect(isExternalParam).toMatchObject({
        type: 'boolean',
        value: true
      })

      // Step 3: Create selected parameters
      const selectedParams = createSelectedParameters(availableParams)
      expect(selectedParams).toHaveLength(5)

      // Verify values are preserved in selection
      const selectedHeight = selectedParams.find((p) => p.name === 'Height')
      expect(selectedHeight).toMatchObject({
        type: 'number',
        value: 3000,
        group: 'Dimensions'
      })

      // Step 4: Create column definitions
      const columns = createColumnDefinitions(selectedParams)
      expect(columns).toHaveLength(5)

      // Verify values are preserved in columns
      const heightColumn = columns.find((c) => c.name === 'Height')
      expect(heightColumn).toMatchObject({
        type: 'number',
        value: 3000,
        group: 'Dimensions',
        field: expect.stringContaining('Height')
      })
    })

    it('should handle equation parameters correctly', async () => {
      const equation: ParameterValue = {
        kind: 'equation',
        expression: '2 * [Height]',
        references: ['Height'],
        resultType: 'number'
      }

      const elements: ElementData[] = [
        {
          id: 'element1',
          name: 'Test Element',
          type: 'Wall',
          category: 'Walls',
          isChild: false,
          parameters: {
            'Calculations.DoubleHeight': equation,
            'Dimensions.Height': 3000
          },
          metadata: {},
          field: 'element1',
          header: 'Test',
          visible: true,
          removable: true,
          details: []
        }
      ]

      // Process through pipeline
      const rawParams = extractRawParameters(elements)
      const availableParams = await processRawParameters(rawParams)
      const selectedParams = createSelectedParameters(availableParams)
      const columns = createColumnDefinitions(selectedParams)

      // Verify equation is preserved
      const equationColumn = columns.find((c) => c.name === 'DoubleHeight')
      expect(equationColumn).toMatchObject({
        value: equation,
        type: 'number', // resultType from equation
        group: 'Calculations'
      })
    })

    it('should handle multiple elements with same parameters but different values', async () => {
      const elements: ElementData[] = [
        {
          id: 'wall1',
          name: 'Wall-1',
          type: 'Wall',
          category: 'Walls',
          isChild: false,
          parameters: {
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
          id: 'wall2',
          name: 'Wall-2',
          type: 'Wall',
          category: 'Walls',
          isChild: false,
          parameters: {
            'Dimensions.Height': 2800,
            Material: 'Brick'
          },
          metadata: {},
          field: 'wall2',
          header: 'Wall',
          visible: true,
          removable: true,
          details: []
        }
      ]

      // Extract and process parameters
      const rawParams = extractRawParameters(elements)
      const availableParams = await processRawParameters(rawParams)
      const selectedParams = createSelectedParameters(availableParams)
      const columns = createColumnDefinitions(selectedParams)

      // Verify we get unique parameters despite different values
      expect(columns).toHaveLength(2) // Height and Material

      // Verify parameter types are consistent
      const heightColumn = columns.find((c) => c.name === 'Height')
      expect(heightColumn).toMatchObject({
        type: 'number',
        group: 'Dimensions'
      })

      const materialColumn = columns.find((c) => c.name === 'Material')
      expect(materialColumn).toMatchObject({
        type: 'string',
        group: 'Parameters'
      })
    })
  })
})
