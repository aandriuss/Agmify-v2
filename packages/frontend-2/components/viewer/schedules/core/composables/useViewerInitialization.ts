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
      if (!state?.viewer?.instance) {
        const err = new ViewerInitializationError('Viewer state not available')
        error.value = err
        debug.error(DebugCategories.ERROR, 'Viewer initialization failed:', err)
        throw err
      }

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

      // Wait for viewer's init promise
      await state.viewer.init.promise

      // Wait for viewer's metadata
      await new Promise<void>((resolve) => {
        const checkMetadata = () => {
          try {
            const worldTree = state.viewer.metadata.worldTree.value
            if (worldTree) {
              resolve()
              return
            }
          } catch (err) {
            debug.warn(DebugCategories.INITIALIZATION, 'Metadata not ready:', err)
          }
          requestAnimationFrame(checkMetadata)
        }
        checkMetadata()
      })

      isInitialized.value = true
      debug.log(DebugCategories.INITIALIZATION, 'Using parent viewer instance')
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Viewer initialization failed:', error)
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
