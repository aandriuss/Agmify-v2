import { computed } from 'vue'
import type { Ref } from 'vue'
import type { CustomParameter } from '~/composables/core/types'

interface UseParameterGroupsParams {
  parameters: Ref<CustomParameter[]>
}

export function useParameterGroups({ parameters }: UseParameterGroupsParams) {
  const groupedParameters = computed(() => {
    if (!parameters.value) return []

    const groups: Record<string, CustomParameter[]> = {}

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
    return Object.entries(groups)
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
  })

  const uniqueGroups = computed(() => {
    if (!parameters.value) return ['Custom']

    const groups = new Set(['Custom'])

    parameters.value.forEach((param) => {
      if (param.group) {
        groups.add(param.group)
      }
    })

    return Array.from(groups).sort((a, b) => {
      if (a === 'Custom') return -1
      if (b === 'Custom') return 1
      return a.localeCompare(b)
    })
  })

  return {
    groupedParameters,
    uniqueGroups
  }
}
