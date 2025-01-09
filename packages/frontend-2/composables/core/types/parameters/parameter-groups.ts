import type { AvailableBimParameter } from './parameter-states'

/**
 * Parameter group types
 */
export type GroupSource = 'bim' | 'user'
export type GroupType = 'category' | 'group'

/**
 * Parameter group definition
 */
export interface ParameterGroup {
  id: string
  name: string
  source: GroupSource
  type: GroupType
  parent?: string
  metadata?: Record<string, unknown>
}

/**
 * Parameter with group information
 */
export interface GroupedParameter extends AvailableBimParameter {
  groupId: string
  originalGroup?: string
}

/**
 * Column group for display
 */
export interface ColumnGroup {
  id: string
  name: string
  type: GroupSource
  parameters: AvailableBimParameter[]
  subgroups: ColumnGroup[]
  metadata?: Record<string, unknown>
}

/**
 * Group hierarchy utilities
 */
export function createGroupHierarchy(
  parameters: AvailableBimParameter[]
): ParameterGroup[] {
  const groups = new Map<string, ParameterGroup>()

  // First pass: collect all natural groups from parameter names
  parameters.forEach((param) => {
    const originalGroup = param.metadata?.originalGroup as string
    const elementType = param.metadata?.elementType as string

    if (originalGroup) {
      const groupId = `bim_${originalGroup}`
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          name: originalGroup,
          source: 'bim',
          type: 'group',
          metadata: {
            elementType,
            isNaturalGroup: true
          }
        })
      }
    }

    // Handle element types as top-level groups
    if (elementType) {
      const typeId = `type_${elementType}`
      if (!groups.has(typeId)) {
        groups.set(typeId, {
          id: typeId,
          name: elementType,
          source: 'bim',
          type: 'category',
          metadata: {
            isElementType: true
          }
        })
      }
    }
  })

  // Second pass: establish hierarchy based on element types
  parameters.forEach((param) => {
    const originalGroup = param.metadata?.originalGroup as string
    const elementType = param.metadata?.elementType as string

    if (originalGroup && elementType) {
      const groupId = `bim_${originalGroup}`
      const typeId = `type_${elementType}`
      const group = groups.get(groupId)
      if (group) {
        group.parent = typeId
      }
    }
  })

  return Array.from(groups.values())
}

/**
 * Organize parameters into display groups
 */
export function organizeParameterGroups(
  parameters: AvailableBimParameter[],
  groups: ParameterGroup[]
): ColumnGroup[] {
  // Create hierarchy map
  const hierarchyMap = new Map<string, ColumnGroup>()

  // Create element type groups first
  groups
    .filter((g) => g.metadata?.isElementType)
    .forEach((g) => {
      hierarchyMap.set(g.id, {
        id: g.id,
        name: g.name,
        type: g.source,
        parameters: [],
        subgroups: [],
        metadata: g.metadata
      })
    })

  // Then add parameter groups
  groups
    .filter((g) => g.metadata?.isNaturalGroup)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((g) => {
      const group: ColumnGroup = {
        id: g.id,
        name: g.name,
        type: g.source,
        parameters: [],
        subgroups: [],
        metadata: g.metadata
      }

      if (g.parent && hierarchyMap.has(g.parent)) {
        const parentGroup = hierarchyMap.get(g.parent)!
        parentGroup.subgroups.push(group)
      } else {
        hierarchyMap.set(g.id, group)
      }
    })

  // Distribute parameters to groups
  parameters.forEach((param) => {
    const originalGroup = param.metadata?.originalGroup as string
    const elementType = param.metadata?.elementType as string

    const groupId = originalGroup ? `bim_${originalGroup}` : undefined
    const typeId = elementType ? `type_${elementType}` : undefined

    if (groupId && hierarchyMap.has(groupId)) {
      // Add to natural group
      const group = hierarchyMap.get(groupId)!
      group.parameters.push(param)
    } else if (typeId && hierarchyMap.has(typeId)) {
      // Add to element type group if no natural group
      const typeGroup = hierarchyMap.get(typeId)!
      typeGroup.parameters.push(param)
    }
  })

  // Return only top-level groups
  return Array.from(hierarchyMap.values()).filter(
    (g) => !groups.find((og) => og.type === 'group' && og.parent === g.id)
  )
}
