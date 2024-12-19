import { describe, it, expect } from 'vitest'
import {
  extractRawParameters,
  processRawParameters,
  createSelectedParameters,
  createColumnDefinitions
} from '../parameter-processing'
import type { ElementData } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'

describe('Parameter Processing', () => {
  describe('Parameter Extraction', () => {
    it('should extract and group parameters correctly', () => {
      const elements: ElementData[] = [
        {
          id: 'element1',
          name: 'Test Element',
          type: 'Wall',
          category: 'Walls',
          isChild: false,
          parameters: {
            'Identity Data.Mark': 'W1',
            'Identity Data.Comments': 'Test wall',
            'Dimensions.Height': 3000,
            Material: 'Concrete',
            // eslint-disable-next-line camelcase
            Pset_BuildingCommon: JSON.stringify({
              Reference: 'REF001',
              Status: 'New'
            })
          },
          metadata: {},
          field: 'element1',
          header: 'Test',
          visible: true,
          removable: true,
          details: []
        }
      ]

      const rawParams = extractRawParameters(elements)

      // Check Identity Data group
      const identityParams = rawParams.filter((p) => p.sourceGroup === 'Identity Data')
      expect(identityParams).toHaveLength(2)
      expect(identityParams).toContainEqual(
        expect.objectContaining({
          name: 'Mark',
          value: 'W1'
        })
      )

      // Check Dimensions group
      const dimensionParams = rawParams.filter((p) => p.sourceGroup === 'Dimensions')
      expect(dimensionParams).toHaveLength(1)
      expect(dimensionParams[0]).toMatchObject({
        name: 'Height',
        value: 3000
      })

      // Check Pset parameters

      const psetParams = rawParams.filter(
        (p) => p.sourceGroup === 'Pset_BuildingCommon'
      )

      expect(psetParams).toHaveLength(2)
      expect(psetParams).toContainEqual(
        expect.objectContaining({
          name: 'Reference',
          value: 'REF001'
        })
      )

      // Check regular parameters
      const regularParams = rawParams.filter((p) => p.sourceGroup === 'Parameters')
      expect(regularParams).toHaveLength(1)
      expect(regularParams[0]).toMatchObject({
        name: 'Material',
        value: 'Concrete'
      })
    })

    it('should handle nested parameter structures', () => {
      const parameters: Record<string, ParameterValue> = {
        'Identity Data.Mark': 'W1',
        'Identity Data.Comments': 'Test wall',
        'Dimensions.Height': 3000,
        'Dimensions.Width': 400
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

      const rawParams = extractRawParameters(elements)

      // Check Identity Data group
      const identityParams = rawParams.filter((p) => p.sourceGroup === 'Identity Data')
      expect(identityParams).toHaveLength(2)
      expect(identityParams).toContainEqual(
        expect.objectContaining({
          name: 'Mark',
          value: 'W1'
        })
      )

      // Check Dimensions group
      const dimensionParams = rawParams.filter((p) => p.sourceGroup === 'Dimensions')
      expect(dimensionParams).toHaveLength(2)
      expect(dimensionParams).toContainEqual(
        expect.objectContaining({
          name: 'Height',
          value: 3000
        })
      )
    })

    it('should skip system parameters', () => {
      const elements: ElementData[] = [
        {
          id: 'element1',
          name: 'Test Element',
          type: 'Wall',
          category: 'Walls',
          isChild: false,
          parameters: {
            __system: 'internal',
            __id: '123',
            Name: 'Test'
          },
          metadata: {},
          field: 'element1',
          header: 'Test',
          visible: true,
          removable: true,
          details: []
        }
      ]

      const rawParams = extractRawParameters(elements)

      // Should only include non-system parameters
      expect(rawParams).toHaveLength(1)
      expect(rawParams[0]).toMatchObject({
        name: 'Name',
        value: 'Test'
      })
    })
  })

  describe('Parameter Processing', () => {
    it('should process raw parameters into available parameters', async () => {
      const rawParams = [
        {
          id: 'param1',
          name: 'Height',
          value: 3000,
          sourceGroup: 'Dimensions'
        },
        {
          id: 'param2',
          name: 'Material',
          value: 'Concrete',
          sourceGroup: 'Parameters'
        }
      ]

      const availableParams = await processRawParameters(rawParams)

      expect(availableParams).toHaveLength(2)
      expect(availableParams).toContainEqual(
        expect.objectContaining({
          name: 'Height',
          type: 'number',
          value: 3000,
          sourceGroup: 'Dimensions'
        })
      )
      expect(availableParams).toContainEqual(
        expect.objectContaining({
          name: 'Material',
          type: 'string',
          value: 'Concrete',
          sourceGroup: 'Parameters'
        })
      )
    })

    it('should handle invalid parameter values', async () => {
      const rawParams = [
        {
          id: 'param1',
          name: 'Valid',
          value: 'test',
          sourceGroup: 'Parameters'
        },
        {
          id: 'param2',
          name: 'Invalid',
          value: Symbol('invalid'), // Invalid value type
          sourceGroup: 'Parameters'
        }
      ]

      const availableParams = await processRawParameters(rawParams)

      // Should only include successfully processed parameters
      expect(availableParams).toHaveLength(1)
      expect(availableParams[0]).toMatchObject({
        name: 'Valid',
        type: 'string',
        value: 'test'
      })
    })
  })

  describe('Parameter Selection', () => {
    it('should create selected parameters preserving existing settings', () => {
      const availableParams = [
        {
          kind: 'bim' as const,
          id: 'param1',
          name: 'Height',
          type: 'number' as const,
          value: 3000,
          sourceGroup: 'Dimensions',
          currentGroup: 'Dimensions',
          isSystem: false
        },
        {
          kind: 'bim' as const,
          id: 'param2',
          name: 'Material',
          type: 'string' as const,
          value: 'Concrete',
          sourceGroup: 'Parameters',
          currentGroup: 'Parameters',
          isSystem: false
        }
      ]

      const existingSelected = [
        {
          id: 'param1',
          name: 'Height',
          kind: 'bim' as const,
          type: 'number' as const,
          value: 3000,
          group: 'Dimensions',
          visible: false,
          order: 1
        }
      ]

      const selectedParams = createSelectedParameters(availableParams, existingSelected)

      expect(selectedParams).toHaveLength(2)

      // Should preserve existing settings
      const heightParam = selectedParams.find((p) => p.id === 'param1')
      expect(heightParam).toMatchObject({
        visible: false,
        order: 1
      })

      // Should create new parameter with defaults
      const materialParam = selectedParams.find((p) => p.id === 'param2')
      expect(materialParam).toMatchObject({
        visible: true,
        order: 1
      })
    })
  })

  describe('Column Definition Creation', () => {
    it('should create column definitions preserving existing settings', () => {
      const selectedParams = [
        {
          id: 'param1',
          name: 'Height',
          kind: 'bim' as const,
          type: 'number' as const,
          value: 3000,
          group: 'Dimensions',
          visible: true,
          order: 0
        }
      ]

      const existingColumns = [
        {
          id: 'param1',
          name: 'Height',
          kind: 'bim' as const,
          type: 'number' as const,
          value: 3000,
          group: 'Dimensions',
          visible: true,
          order: 0,
          field: 'height',
          header: 'Custom Header',
          width: 100,
          sortable: true,
          filterable: true
        }
      ]

      const columns = createColumnDefinitions(selectedParams, existingColumns)

      expect(columns).toHaveLength(1)
      expect(columns[0]).toMatchObject({
        header: 'Custom Header',
        width: 100,
        sortable: true,
        filterable: true
      })
    })
  })
})
