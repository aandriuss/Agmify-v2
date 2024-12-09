import { ref } from 'vue'
import { useParameterMappingsGraphQL } from './useParameterMappingsGraphQL'
import type { ParameterMappings } from '~/composables/core/types'

export function useParameterMappingsState() {
  const mappings = ref<ParameterMappings>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { fetchMappings, updateMappings: updateMappingsGQL } =
    useParameterMappingsGraphQL()

  async function loadMappings(): Promise<void> {
    try {
      isLoading.value = true
      error.value = null

      mappings.value = await fetchMappings()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load mappings'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function saveMappings(newMappings: ParameterMappings): Promise<boolean> {
    try {
      isLoading.value = true
      error.value = null

      const success = await updateMappingsGQL(newMappings)
      if (success) {
        mappings.value = newMappings
      }
      return success
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to save mappings'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  return {
    mappings,
    isLoading,
    error,
    loadMappings,
    saveMappings
  }
}
