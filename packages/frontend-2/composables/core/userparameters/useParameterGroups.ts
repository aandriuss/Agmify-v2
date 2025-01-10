import { computed } from 'vue'
import type { Ref } from 'vue'
import type { AvailableUserParameter } from '~/composables/core/types'
import { debug, DebugCategories } from '~/composables/core/utils/debug'

export interface ParameterGroup {
  name: string
  parameters: AvailableUserParameter[]
}

interface UseParameterGroupsParams {
  parameters: Ref<AvailableUserParameter[]>
  onError?: (error: string) => void
}

export class ParameterGroupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterGroupError'
  }
}

/**
 * Hook for parameter grouping functionality
 * Handles grouping parameters and managing group operations
 */
export function useParameterGroups({ parameters, onError }: UseParameterGroupsParams) {
  const handleError = (err: unknown) => {
    const message = err instanceof Error ? err.message : 'An unknown error occurred'
    if (onError) onError(message)
    throw new ParameterGroupError(message)
  }

  const groupedParameters = computed<ParameterGroup[]>(() => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Grouping parameters')

      if (!parameters.value) {
        debug.log(DebugCategories.PARAMETERS, 'No parameters to group')
        return []
      }

      const groups: Record<string, AvailableUserParameter[]> = {}

      // Add default Custom group
      groups['Custom'] = []

      // Group parameters
      parameters.value.forEach((param) => {
        const group = param.group || 'Custom'
        if (!groups[group]) {
          groups[group] = []
        }
        groups[group].push(param)
      })

      // Convert to array and sort groups
      const result = Object.entries(groups)
        .map(([name, params]) => ({
          name,
          parameters: params.sort((a, b) => a.name.localeCompare(b.name))
        }))
        .sort((a, b) => {
          // Always put Custom group first
          if (a.name === 'Custom') return -1
          if (b.name === 'Custom') return 1
          return a.name.localeCompare(b.name)
        })

      debug.completeState(DebugCategories.PARAMETERS, 'Parameters grouped', {
        groupCount: result.length,
        parameterCount: parameters.value.length
      })

      return result
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to group parameters:', err)
      handleError(err)
      return []
    }
  })

  const uniqueGroups = computed<string[]>(() => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Getting unique groups')

      if (!parameters.value) {
        debug.log(DebugCategories.PARAMETERS, 'No parameters available')
        return ['Custom']
      }

      const groups = new Set(['Custom'])

      parameters.value.forEach((param) => {
        if (param.group) {
          groups.add(param.group)
        }
      })

      const result = Array.from(groups).sort((a, b) => {
        if (a === 'Custom') return -1
        if (b === 'Custom') return 1
        return a.localeCompare(b)
      })

      debug.completeState(DebugCategories.PARAMETERS, 'Unique groups retrieved', {
        groupCount: result.length,
        groups: result
      })

      return result
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to get unique groups:', err)
      handleError(err)
      return ['Custom']
    }
  })

  return {
    groupedParameters,
    uniqueGroups
  }
}
