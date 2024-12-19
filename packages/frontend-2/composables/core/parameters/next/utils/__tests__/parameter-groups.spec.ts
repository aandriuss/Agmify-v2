import { describe, it, expect } from 'vitest'
import {
  extractRawParameters,
  processRawParameters,
  createSelectedParameters,
  createColumnDefinitions
} from '../parameter-processing'
import type { ElementData } from '~/composables/core/types'
import type { ParameterValue } from '~/composables/core/types/parameters'

describe('Parameter Groups', () => {
  describe('Group Hierarchy', () => {
    it('should maintain group hierarchy through processing', async () => {
      const parameters: Record<string, ParameterValue> = {
        // Identity Data group
        'Identity Data.Mark': 'W1',
        'Identity Data.Comments': 'Test wall',
        'Identity Data.Description': 'External wall',

        // Dimensions group
        'Dimensions.Height': 3000,
        'Dimensions.Width': 400,
        'Dimensions.Area': 1200000,

        // Nested Pset group

        'Pset_BuildingCommon.Reference': 'REF001',
        'Pset_BuildingCommon.Status': 'New',
        'Pset_BuildingCommon.Description': 'Common building element',

        // Regular parameters
        Material: 'Concrete',
        Type: 'Basic Wall'
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

      // Verify group counts
      const groupCounts = rawParams.reduce((acc, param) => {
        acc[param.sourceGroup] = (acc[param.sourceGroup] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      expect(groupCounts).toMatchObject({
        'Identity Data': 3,
        Dimensions: 3,

        Pset_BuildingCommon: 3,

        Parameters: 2 // Material and Type
      })

      // Step 2: Process into available parameters
      const availableParams = await processRawParameters(rawParams)

      // Verify groups are maintained
      const identityParams = availableParams.filter(
        (p) => p.sourceGroup === 'Identity Data'
      )
      expect(identityParams).toHaveLength(3)
      expect(identityParams.map((p) => p.name)).toContain('Mark')
      expect(identityParams.map((p) => p.name)).toContain('Comments')
      expect(identityParams.map((p) => p.name)).toContain('Description')

      const dimensionParams = availableParams.filter(
        (p) => p.sourceGroup === 'Dimensions'
      )
      expect(dimensionParams).toHaveLength(3)
      expect(dimensionParams.every((p) => p.type === 'number')).toBe(true)

      // Step 3: Create selected parameters
      const selectedParams = createSelectedParameters(availableParams)

      // Verify group information is preserved in selection
      const selectedGroups = new Set(selectedParams.map((p) => p.group))
      expect(selectedGroups.size).toBe(4) // Identity Data, Dimensions, Pset_BuildingCommon, Parameters

      // Step 4: Create column definitions
      const columns = createColumnDefinitions(selectedParams)

      // Verify group information is preserved in columns
      const columnGroups = new Set(columns.map((c) => c.group))
      expect(columnGroups.size).toBe(4)
    })

    it('should handle system parameters correctly', async () => {
      const parameters: Record<string, ParameterValue> = {
        // System parameters (should be filtered)
        '__system.id': '123',
        '__internal.type': 'wall',
        '__metadata.version': '1.0',

        // Regular parameters (should be kept)
        'Identity Data.Mark': 'W1',
        Material: 'Concrete'
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

      // Extract and process parameters
      const rawParams = extractRawParameters(elements)
      const availableParams = await processRawParameters(rawParams)
      const selectedParams = createSelectedParameters(availableParams)
      const columns = createColumnDefinitions(selectedParams)

      // Verify system parameters are filtered out
      expect(rawParams.some((p) => p.sourceGroup.startsWith('__'))).toBe(false)
      expect(availableParams.some((p) => p.sourceGroup.startsWith('__'))).toBe(false)
      expect(selectedParams.some((p) => p.group.startsWith('__'))).toBe(false)
      expect(columns.some((c) => c.group.startsWith('__'))).toBe(false)

      // Verify regular parameters are kept
      expect(columns).toHaveLength(2) // Mark and Material
      expect(columns.map((c) => c.name)).toContain('Mark')
      expect(columns.map((c) => c.name)).toContain('Material')
    })

    it('should handle deeply nested parameter groups', async () => {
      const parameters: Record<string, ParameterValue> = {
        'Identity Data.Details.Description': 'Test wall',
        'Identity Data.Details.Notes.Author': 'John',
        'Identity Data.Details.Notes.Date': '2023-01-01',
        'Dimensions.Size.Height.Value': 3000,
        'Dimensions.Size.Height.Unit': 'mm'
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

      // Extract and process parameters
      const rawParams = extractRawParameters(elements)

      // Verify nested groups are flattened correctly
      expect(rawParams).toHaveLength(5)
      expect(rawParams.map((p) => p.name)).toContain('Description')
      expect(rawParams.map((p) => p.name)).toContain('Author')
      expect(rawParams.map((p) => p.name)).toContain('Date')
      expect(rawParams.map((p) => p.name)).toContain('Value')
      expect(rawParams.map((p) => p.name)).toContain('Unit')

      // Process through pipeline
      const availableParams = await processRawParameters(rawParams)
      const selectedParams = createSelectedParameters(availableParams)
      const columns = createColumnDefinitions(selectedParams)

      // Verify group hierarchy is maintained
      const identityGroup = columns.filter((c) => c.group === 'Identity Data')
      expect(identityGroup).toHaveLength(3)

      const dimensionsGroup = columns.filter((c) => c.group === 'Dimensions')
      expect(dimensionsGroup).toHaveLength(2)
    })
  })
})
