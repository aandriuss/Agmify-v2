import type { BIMNodeData } from '~/composables/core/types'
import type { ParameterGroup } from '~/composables/core/types/parameters/parameter-groups'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

interface RawElementData {
  parameters?: {
    _groups?: Record<string, string>
    [key: string]: unknown
  }
  [key: string]: unknown
}

export interface ExtractedParameter {
  id: string
  name: string
  value: unknown
  group?: string
  category?: string
  metadata: Record<string, unknown>
}

/**
 * Extract raw parameters from element data
 * This should happen before any parent/child categorization
 */
export function extractRawParameters(elements: BIMNodeData[]): ExtractedParameter[] {
  const parameterMap = new Map<string, ExtractedParameter>()

  try {
    // First pass: collect all unique parameters with their groups
    elements.forEach((element) => {
      if (!element.parameters) return

      Object.entries(element.parameters).forEach(([key, value]) => {
        // Skip if already processed with a non-null value
        const existing = parameterMap.get(key)
        if (existing && existing.value !== null) return

        // Extract group and name from parameter key
        const nameParts = key.split('.')
        const group = nameParts.length > 1 ? nameParts[0] : 'Other'
        const name = nameParts.length > 1 ? nameParts.slice(1).join('.') : key

        // Create or update parameter entry
        parameterMap.set(key, {
          id: key,
          name: nameParts.length > 1 ? nameParts.slice(1).join('.') : key, // Remove group prefix from name
          value: value ?? null,
          group,
          category: element.type,
          metadata: {
            elementId: element.id,
            category: element.type,
            originalGroup: group,
            elementType: element.type,
            displayName: name // Store original name for reference
          }
        })
      })
    })

    // Convert map to array
    const extractedParams = Array.from(parameterMap.values())

    // Log extraction results with group information
    const groups = new Set(extractedParams.map((p) => p.group))
    // Group parameters and create debug info
    const groupedParams = Array.from(groups).reduce<Record<string, string[]>>(
      (acc, group) => {
        acc[group || 'Other'] = extractedParams
          .filter((p) => p.group === group)
          .slice(0, 3)
          .map((p) => p.name)
        return acc
      },
      {}
    )

    debug.log(DebugCategories.PARAMETERS, 'Parameters extracted', {
      totalParameters: extractedParams.length,
      groups: Array.from(groups),
      samplesByGroup: groupedParams
    })

    return extractedParams
  } catch (err) {
    debug.error(DebugCategories.PARAMETERS, 'Failed to extract parameters:', err)
    throw err
  }
}

/**
 * Extract parameter groups from raw data
 */
export function extractParameterGroups(elements: BIMNodeData[]): ParameterGroup[] {
  const groups = new Map<string, ParameterGroup>()

  try {
    elements.forEach((element) => {
      if (!element.parameters) return

      const elementParams = element.parameters || {}

      // Extract groups from parameter names
      Object.keys(elementParams).forEach((key) => {
        const nameParts = key.split('.')
        if (nameParts.length > 1) {
          const groupName = nameParts[0]
          const groupId = `bim_${groupName}`
          if (!groups.has(groupId)) {
            groups.set(groupId, {
              id: groupId,
              name: groupName,
              source: 'bim',
              type: 'group',
              metadata: {
                category: element.type,
                originalSource: 'parameter_name'
              }
            })
          }
        }
      })

      // Extract groups from raw data structure
      const rawData = (element._raw || {}) as RawElementData
      const rawGroups = rawData.parameters?._groups
      if (rawGroups) {
        Object.values(rawGroups).forEach((groupName) => {
          if (!groupName || typeof groupName !== 'string') return

          const groupId = `bim_${groupName}`
          if (!groups.has(groupId)) {
            groups.set(groupId, {
              id: groupId,
              name: groupName,
              source: 'bim',
              type: 'group',
              metadata: {
                category: element.type,
                originalSource: 'bim_structure'
              }
            })
          }
        })
      }
    })

    debug.log(DebugCategories.PARAMETERS, 'Parameter groups extracted', {
      totalGroups: groups.size,
      groups: Array.from(groups.values()).map((g) => g.name)
    })

    return Array.from(groups.values())
  } catch (err) {
    debug.error(DebugCategories.PARAMETERS, 'Failed to extract parameter groups:', err)
    throw err
  }
}

/**
 * Filter parameters by categories
 * This should happen after parameter extraction
 */
export function filterParametersByCategories(
  parameters: ExtractedParameter[],
  parentCategories: string[],
  childCategories: string[]
): {
  parent: ExtractedParameter[]
  child: ExtractedParameter[]
} {
  // Group parameters by their natural groups first
  const groupedParams = parameters.reduce<Record<string, ExtractedParameter[]>>(
    (acc, param) => {
      const group = param.group || 'Other'
      if (!acc[group]) acc[group] = []
      acc[group].push(param)
      return acc
    },
    {}
  )

  // Then split each group into parent/child based on categories
  const result = {
    parent: [] as ExtractedParameter[],
    child: [] as ExtractedParameter[]
  }

  Object.values(groupedParams).forEach((params) => {
    params.forEach((param) => {
      const category = param.category || 'Uncategorized'
      if (parentCategories.includes(category)) {
        result.parent.push(param)
      } else if (childCategories.includes(category)) {
        result.child.push(param)
      }
    })
  })

  debug.log(DebugCategories.PARAMETERS, 'Parameters filtered by categories', {
    total: parameters.length,
    parent: {
      total: result.parent.length,
      byGroup: Object.fromEntries(
        Object.entries(groupedParams).map(([group, params]) => [
          group,
          params.filter((p) => parentCategories.includes(p.category || 'Uncategorized'))
            .length
        ])
      )
    },
    child: {
      total: result.child.length,
      byGroup: Object.fromEntries(
        Object.entries(groupedParams).map(([group, params]) => [
          group,
          params.filter((p) => childCategories.includes(p.category || 'Uncategorized'))
            .length
        ])
      )
    }
  })

  return result
}
