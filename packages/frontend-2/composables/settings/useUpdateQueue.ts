import { ref } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface QueuedUpdate<T> {
  execute: () => Promise<void>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
  retryCount: number
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second
const UPDATE_DELAY = 500 // 0.5 seconds between updates

export function useUpdateQueue() {
  const isProcessing = ref(false)
  const updateQueue = ref<QueuedUpdate<unknown>[]>([])

  async function processQueue() {
    if (isProcessing.value || updateQueue.value.length === 0) return

    isProcessing.value = true
    const update = updateQueue.value[0]

    try {
      debug.startState(DebugCategories.STATE, 'Processing queued update', {
        queueLength: updateQueue.value.length,
        retryCount: update.retryCount
      })

      await update.execute()
      updateQueue.value.shift() // Remove processed update

      debug.completeState(DebugCategories.STATE, 'Update processed successfully', {
        remainingUpdates: updateQueue.value.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process update', err)

      // Retry logic
      if (update.retryCount < MAX_RETRIES) {
        update.retryCount++
        debug.log(DebugCategories.STATE, 'Retrying update', {
          retryCount: update.retryCount,
          maxRetries: MAX_RETRIES
        })

        // Move to end of queue and retry after delay
        updateQueue.value.shift()
        updateQueue.value.push(update)
        setTimeout(processQueue, RETRY_DELAY)
      } else {
        debug.error(DebugCategories.ERROR, 'Max retries exceeded, rejecting update', {
          error: err
        })
        update.reject(err)
        updateQueue.value.shift() // Remove failed update
      }
    } finally {
      isProcessing.value = false

      // Process next update if any
      if (updateQueue.value.length > 0) {
        setTimeout(processQueue, UPDATE_DELAY)
      }
    }
  }

  function queueUpdate<T>(updateFn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedUpdate: QueuedUpdate<T> = {
        execute: async () => {
          try {
            const result = await updateFn()
            resolve(result)
          } catch (err) {
            reject(err)
          }
        },
        resolve,
        reject,
        retryCount: 0
      }

      updateQueue.value.push(queuedUpdate as QueuedUpdate<unknown>)

      debug.log(DebugCategories.STATE, 'Update queued', {
        queueLength: updateQueue.value.length,
        isProcessing: isProcessing.value
      })

      // Start processing if not already running
      if (!isProcessing.value) {
        void processQueue()
      }
    })
  }

  function clearQueue() {
    debug.startState(DebugCategories.STATE, 'Clearing update queue', {
      queueLength: updateQueue.value.length
    })

    // Reject all pending updates
    updateQueue.value.forEach((update) => {
      update.reject(new Error('Queue cleared'))
    })

    updateQueue.value = []
    isProcessing.value = false

    debug.completeState(DebugCategories.STATE, 'Update queue cleared')
  }

  return {
    isProcessing,
    queueUpdate,
    clearQueue,
    queueLength: () => updateQueue.value.length,
    // Expose for testing
    _queue: updateQueue,
    _setProcessing: (value: boolean) => {
      isProcessing.value = value
    }
  }
}
