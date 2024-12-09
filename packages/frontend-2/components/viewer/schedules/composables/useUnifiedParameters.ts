import { computed, type ComputedRef, watch } from 'vue'
import type {
  Parameter,
  BimParameter,
  UserParameter,
  BimValueType
} from '~/composables/core/types'
import { useStore } from '../core/store'
import { debug, DebugCategories } from '../debug/useDebug'
import { createBimParameter, createUserParameter } from '~/composables/core/types'

// Define ProcessedHeader interface
interface ProcessedHeader {
  id: string
  name: string
  field: string
  header: string
  type: BimValueType
  category?: string
  source?: string
  description?: string
  fetchedGroup?: string
  currentGroup?: string
  metadata?: Record<string, unknown>
}

interface UseUnifiedParametersProps {
  discoveredParameters: ComputedRef<{
    parent: ProcessedHeader[]
    child: ProcessedHeader[]
  }>
  customParameters: ComputedRef<UserParameter[] | null>
}

export function useUnifiedParameters({
  discoveredParameters,
  customParameters
}: UseUnifiedParametersProps) {
  const store = useStore()

  // Helper to safely get string value
  function safeString(value: unknown, defaultValue: string = ''): string {
    return typeof value === 'string' ? value : defaultValue
  }

  // Convert discovered parameters to BIM parameters
  const convertDiscoveredToBim = (header: ProcessedHeader): BimParameter =>
    createBimParameter({
      id: header.id,
      name: header.name,
      field: header.field,
      header: header.header,
      type: header.type,
      visible: true,
      removable: true,
      value: null,
      sourceValue: null,
      fetchedGroup: safeString(header.fetchedGroup, 'Parameters'),
      currentGroup: safeString(header.currentGroup, 'Parameters'),
      description: safeString(header.description),
      metadata: {
        category: safeString(header.category, 'Parameters'),
        source: safeString(header.source, 'BIM')
      }
    })

  // Convert custom parameters to user parameters if needed
  const convertToUserParameter = (param: UserParameter | unknown): UserParameter => {
    if (isUserParameter(param)) return param

    // If it's not already a UserParameter, create one with safe type conversion
    const customParam = param as Record<string, unknown>
    return createUserParameter({
      id: safeString(customParam.id, crypto.randomUUID()),
      name: safeString(customParam.name, 'Custom Parameter'),
      field: safeString(customParam.field, 'custom_field'),
      type: customParam.type === 'equation' ? 'equation' : 'fixed',
      group: safeString(customParam.category, 'Custom'),
      visible: Boolean(customParam.visible ?? true),
      header: safeString(customParam.header, 'Custom Parameter'),
      removable: Boolean(customParam.removable ?? true),
      value: null,
      description: safeString(customParam.description),
      metadata: {
        source: safeString(customParam.source, 'Custom'),
        order: Number(customParam.order || 0)
      }
    })
  }

  // Type guard for UserParameter
  function isUserParameter(param: unknown): param is UserParameter {
    return (
      typeof param === 'object' &&
      param !== null &&
      'kind' in param &&
      param.kind === 'user'
    )
  }

  // Compute unified parameters for parent
  const parentParameters = computed<Parameter[]>(() => {
    const discovered = discoveredParameters.value.parent.map(convertDiscoveredToBim)
    const custom = (customParameters.value || []).map(convertToUserParameter)
    return [...discovered, ...custom]
  })

  // Compute unified parameters for child
  const childParameters = computed<Parameter[]>(() => {
    const discovered = discoveredParameters.value.child.map(convertDiscoveredToBim)
    const custom = (customParameters.value || []).map(convertToUserParameter)
    return [...discovered, ...custom]
  })

  // Update store with new parameters
  const updateStore = async () => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Updating parameters')

      await store.lifecycle.update({
        availableHeaders: {
          parent: parentParameters.value,
          child: childParameters.value
        }
      })

      debug.completeState(DebugCategories.PARAMETERS, 'Updated parameters', {
        parentCount: parentParameters.value.length,
        childCount: childParameters.value.length,
        discoveredParent: discoveredParameters.value.parent.length,
        discoveredChild: discoveredParameters.value.child.length,
        customCount: customParameters.value?.length || 0,
        parentGroups: [...new Set(parentParameters.value.map((p) => p.currentGroup))],
        childGroups: [...new Set(childParameters.value.map((p) => p.currentGroup))],
        parameterTypes: {
          parent: parentParameters.value.map((p) => p.kind),
          child: childParameters.value.map((p) => p.kind)
        }
      })
    } catch (error) {
      debug.error(DebugCategories.ERROR, 'Error updating parameters:', error)
      throw error
    }
  }

  // Watch for changes in parameters
  watch(
    [discoveredParameters, customParameters],
    async (newValues, oldValues) => {
      const [newDiscovered, _newCustom] = newValues
      const [oldDiscovered, _oldCustom] = oldValues || []

      if (JSON.stringify(newDiscovered) !== JSON.stringify(oldDiscovered)) {
        await updateStore()
      }
    },
    { immediate: true }
  )

  return {
    parentParameters,
    childParameters,
    updateStore
  }
}
