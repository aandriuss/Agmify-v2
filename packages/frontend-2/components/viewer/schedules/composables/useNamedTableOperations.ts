import type { NamedTableConfig } from '~/composables/useUserSettings'
import type { ScheduleInitializationInstance } from '../types'
import type { Ref } from 'vue'

interface UseNamedTableOperationsOptions {
  initComponent: Ref<ScheduleInitializationInstance | null>
  handleError: (err: Error | unknown) => void
}

export function useNamedTableOperations({
  initComponent,
  handleError
}: UseNamedTableOperationsOptions) {
  const updateNamedTable = async (id: string, config: Partial<NamedTableConfig>) => {
    try {
      if (initComponent.value) {
        await initComponent.value.updateNamedTable(id, config)
        // Return the updated config with id and timestamp
        return {
          id,
          ...config,
          lastUpdateTimestamp: Date.now()
        } as NamedTableConfig
      }
      throw new Error('Initialization component not available')
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  const createNamedTable = async (
    name: string,
    config: Omit<NamedTableConfig, 'id' | 'name'>
  ) => {
    try {
      if (initComponent.value) {
        const newTable = await initComponent.value.createNamedTable(name, config)
        return newTable
      }
      throw new Error('Initialization component not available')
    } catch (err) {
      handleError(err)
      throw err
    }
  }

  return {
    updateNamedTable,
    createNamedTable
  }
}
