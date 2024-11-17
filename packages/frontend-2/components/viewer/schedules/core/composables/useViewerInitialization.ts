import { ref, watch, type Ref } from 'vue'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { debug, DebugCategories } from '../../utils/debug'

interface ViewerState {
  isInitialized: Ref<boolean>
  error: Ref<Error | null>
  viewer: ReturnType<typeof useInjectedViewerState>['viewer']['instance'] | null
  waitForInitialization: () => Promise<void>
}

export class ViewerInitializationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ViewerInitializationError'
  }
}

export function useViewerInitialization(): ViewerState {
  const isInitialized = ref(false)
  const error = ref<Error | null>(null)
  const state = useInjectedViewerState()

  async function waitForInitialization(): Promise<void> {
    try {
      // Reset initialization state at start
      isInitialized.value = false

      if (!state?.viewer?.instance) {
        const err = new ViewerInitializationError('Viewer state not available')
        error.value = err
        debug.error(DebugCategories.ERROR, 'Viewer initialization failed:', err)
        throw err
      }

      debug.log(DebugCategories.INITIALIZATION, 'Starting viewer initialization')

      // Wait for parent viewer to be ready
      await new Promise<void>((resolve) => {
        if (state.viewer.init.ref.value) {
          resolve()
          return
        }

        const unwatch = watch(
          () => state.viewer.init.ref.value,
          (newVal) => {
            if (newVal) {
              unwatch()
              resolve()
            }
          }
        )
      })

      debug.log(DebugCategories.INITIALIZATION, 'Parent viewer ready')

      // Wait for viewer's init promise
      await state.viewer.init.promise
      debug.log(DebugCategories.INITIALIZATION, 'Viewer init promise resolved')

      // Wait for viewer's metadata with timeout
      await new Promise<void>((resolve, reject) => {
        const startTime = Date.now()
        const timeout = 10000 // 10 second timeout

        const checkMetadata = () => {
          try {
            const worldTree = state.viewer.metadata.worldTree.value
            if (worldTree) {
              debug.log(DebugCategories.INITIALIZATION, 'Viewer metadata ready')
              resolve()
              return
            }

            // Check for timeout
            if (Date.now() - startTime > timeout) {
              const err = new ViewerInitializationError(
                'Timeout waiting for viewer metadata'
              )
              debug.error(DebugCategories.ERROR, err.message)
              reject(err)
              return
            }

            requestAnimationFrame(checkMetadata)
          } catch (err) {
            debug.warn(DebugCategories.INITIALIZATION, 'Metadata check failed:', err)
            requestAnimationFrame(checkMetadata)
          }
        }
        checkMetadata()
      })

      // Set initialization complete only after all steps succeed
      isInitialized.value = true
      debug.log(DebugCategories.INITIALIZATION, 'Viewer initialization complete')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Viewer initialization failed:', error)
      isInitialized.value = false // Ensure initialization state is false on error
      throw error
    }
  }

  return {
    isInitialized,
    error,
    viewer: state?.viewer?.instance || null,
    waitForInitialization
  }
}
