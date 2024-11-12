import { ref } from 'vue'
import type { TreeItemComponentModel } from '../types'
import { debug } from '../utils/debug'
import { useInjectedViewer } from '~~/lib/viewer/composables/setup'

export function useScheduleInitialization() {
  const loadingError = ref<Error | null>(null)
  const {
    metadata: { worldTree }
  } = useInjectedViewer()

  async function initializeData(): Promise<void> {
    try {
      debug.startState('dataInit')
      debug.log('Starting data initialization')

      // Wait for WorldTree to be available
      let retryCount = 0
      while (!worldTree.value?._root?.children && retryCount < 50) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        retryCount++
        debug.log('⏳ Waiting for WorldTree...', { retryCount })
      }

      const tree = worldTree.value
      if (!tree?._root?.children) {
        debug.error('No WorldTree data available')
        throw new Error('No WorldTree data available')
      }

      debug.log('🌳 WorldTree data ready:', {
        rootType: tree._root.type,
        childCount: tree._root.children.length,
        firstChild: tree._root.children[0]
      })

      debug.completeState('dataInit')
    } catch (err) {
      loadingError.value =
        err instanceof Error ? err : new Error('Failed to initialize data')
      debug.error('Initialization error:', err)
      throw loadingError.value
    }
  }

  async function waitForData<T>(
    getValue: () => T | undefined | null,
    validate: (value: T) => boolean,
    timeout = 10000
  ): Promise<T> {
    debug.startState('dataWait')
    const start = Date.now()
    let value = getValue()
    let attempts = 0

    while ((!value || !validate(value)) && Date.now() - start < timeout) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 100))
      value = getValue()

      // Log progress every second
      if (attempts % 10 === 0) {
        debug.log('Waiting for data:', {
          hasValue: !!value,
          isValid: value ? validate(value) : false,
          elapsed: Date.now() - start,
          attempts,
          remainingTime: timeout - (Date.now() - start),
          currentValue: value ? JSON.stringify(value).slice(0, 200) + '...' : 'null'
        })
      }

      // If we have a value but it's invalid, log details
      if (value && !validate(value)) {
        debug.warn('Invalid data received:', {
          value:
            typeof value === 'object'
              ? JSON.stringify(value, null, 2).slice(0, 200) + '...'
              : value,
          validationResult: validate(value)
        })
      }
    }

    if (!value || !validate(value)) {
      debug.error('Data wait timeout:', {
        hasValue: !!value,
        isValid: value ? validate(value) : false,
        elapsed: Date.now() - start,
        attempts,
        value: value ? JSON.stringify(value, null, 2).slice(0, 200) + '...' : 'null'
      })

      const error = new Error('Timeout waiting for data')
      loadingError.value = error
      debug.completeState('dataWait')
      throw error
    }

    debug.log('Data ready:', {
      elapsed: Date.now() - start,
      attempts,
      dataType: typeof value,
      isArray: Array.isArray(value),
      length: Array.isArray(value) ? value.length : null,
      value: JSON.stringify(value).slice(0, 200) + '...'
    })

    debug.completeState('dataWait')
    return value
  }

  return {
    loadingError,
    initializeData,
    waitForData
  }
}
