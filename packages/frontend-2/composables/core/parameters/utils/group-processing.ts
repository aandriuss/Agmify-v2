import type { ElementData } from '~/composables/core/types'
import type { BimValueType } from '~/composables/core/types/parameters'
import type {
  ParameterGroup,
  GroupedParameter
} from '~/composables/core/types/parameters/parameter-groups'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

// Helper function to infer parameter type
export function inferParameterType(value: unknown): BimValueType {
  if (value === null || value === undefined) return 'string'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'string') return 'string'
  if (value instanceof Date) return 'date'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'object'
  return 'string'
}

/**
 * Extract parameter groups from BIM data
 */
export function extractParameterGroups(elements: ElementData[]): ParameterGroup[] {
  const groups = new Map<string, ParameterGroup>()

  try {
    elements.forEach((element) => {
      if (!element.parameters) return

      // Extract groups from raw data structure
      Object.entries(element.parameters).forEach(([key, value]) => {
        // Check if key contains group information (e.g., "Constraints.Base Offset")
        const parts = key.split('.')
        if (parts.length > 1) {
          const groupName = parts[0]
          const groupId = `bim_${groupName}`

          if (!groups.has(groupId)) {
            groups.set(groupId, {
              id: groupId,
              name: groupName,
              source: 'bim',
              type: 'group',
              metadata: {
                category: element.category,
                originalSource: 'parameter_name'
              }
            })
          }
        }

        // Extract groups from raw BIM data structure
        if (typeof value === 'object' && value !== null) {
          const groupName = key
          const groupId = `bim_${groupName}`

          if (!groups.has(groupId)) {
            groups.set(groupId, {
              id: groupId,
              name: groupName,
              source: 'bim',
              type: 'group',
              metadata: {
                category: element.category,
                originalSource: 'bim_structure'
              }
            })
          }
        }
      })

      // Extract category as top-level group
      if (element.category) {
        const categoryId = `category_${element.category}`
        if (!groups.has(categoryId)) {
          groups.set(categoryId, {
            id: categoryId,
            name: element.category,
            source: 'bim',
            type: 'category'
          })
        }
      }
    })

    // Establish group hierarchy
    groups.forEach((group) => {
      if (group.type === 'group' && group.metadata?.category) {
        const categoryId = `category_${group.metadata.category}`
        if (groups.has(categoryId)) {
          group.parent = categoryId
        }
      }
    })

    debug.log(DebugCategories.PARAMETERS, 'Parameter groups extracted', {
      totalGroups: groups.size,
      categories: Array.from(groups.values())
        .filter((g) => g.type === 'category')
        .map((g) => g.name),
      groups: Array.from(groups.values())
        .filter((g) => g.type === 'group')
        .map((g) => g.name)
    })

    return Array.from(groups.values())
  } catch (err) {
    debug.error(DebugCategories.PARAMETERS, 'Failed to extract parameter groups:', err)
    throw err
  }
}

/**
 * Process parameters with group information
 */
export function processParametersWithGroups(
  elements: ElementData[],
  groups: ParameterGroup[]
): GroupedParameter[] {
  const parameters: GroupedParameter[] = []
  const groupMap = new Map(groups.map((g) => [g.id, g]))

  try {
    elements.forEach((element) => {
      if (!element.parameters) return

      Object.entries(element.parameters).forEach(([key, value]) => {
        // Determine group from parameter name
        const parts = key.split('.')
        const groupName = parts.length > 1 ? parts[0] : undefined
        const paramName = parts.length > 1 ? parts.slice(1).join('.') : key

        // Find matching group
        let groupId: string | undefined
        if (groupName) {
          groupId = `bim_${groupName}`
        } else if (element.category) {
          groupId = `category_${element.category}`
        }

        // Create grouped parameter with clean name
        const group = groupId ? groupMap.get(groupId) : undefined
        parameters.push({
          id: key,
          name: paramName,
          value,
          groupId: groupId || '',
          originalGroup: groupName,
          category: element.category || 'Uncategorized',
          kind: 'bim',
          type: inferParameterType(value),
          fetchedGroup: group?.name || groupName || 'Parameters',
          currentGroup: group?.name || groupName || 'Parameters',
          isSystem: (groupName || '').startsWith('__'),
          metadata: {
            elementId: element.id,
            category: element.category,
            displayName: paramName,
            originalGroup: groupName,
            groupName: group?.name
          }
        } as GroupedParameter)
      })
    })

    debug.log(DebugCategories.PARAMETERS, 'Parameters processed with groups', {
      totalParameters: parameters.length,
      groupedParameters: parameters.filter((p) => p.groupId).length,
      ungroupedParameters: parameters.filter((p) => !p.groupId).length
    })

    return parameters
  } catch (err) {
    debug.error(
      DebugCategories.PARAMETERS,
      'Failed to process parameters with groups:',
      err
    )
    throw err
  }
}

/**
 * Merge user-defined groups with BIM groups
 */
export function mergeParameterGroups(
  bimGroups: ParameterGroup[],
  userGroups: ParameterGroup[]
): ParameterGroup[] {
  const mergedGroups = new Map<string, ParameterGroup>()

  // Add BIM groups first
  bimGroups.forEach((group) => mergedGroups.set(group.id, group))

  // Add or update with user groups, preserving natural groups
  userGroups.forEach((group) => {
    const existingGroup = mergedGroups.get(group.id)
    if (existingGroup) {
      // Update existing group with user preferences while preserving natural group info
      mergedGroups.set(group.id, {
        ...existingGroup,
        name: group.name, // User-defined name takes precedence
        metadata: {
          ...existingGroup.metadata,
          ...group.metadata,
          originalName: existingGroup.name, // Preserve original BIM name
          isNaturalGroup: existingGroup.metadata?.isNaturalGroup || false
        }
      })
    } else {
      // Add new user group
      mergedGroups.set(group.id, {
        ...group,
        metadata: {
          ...group.metadata,
          isNaturalGroup: false // Mark as not a natural group
        }
      })
    }
  })

  return Array.from(mergedGroups.values())
}
