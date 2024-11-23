import { ref } from 'vue'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

interface QueuedUpdate<T> {
  execute: () => Promise<void>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export function useUpdateQueue() {
  const isProcessing = ref(false)
  const updateQueue = ref<QueuedUpdate<unknown>[]>([])

  async function processQueue() {
    if (isProcessing.value || updateQueue.value.length === 0) return

    isProcessing.value = true
    const update = updateQueue.value[0]

    try {
      await update.execute()
      updateQueue.value.shift() // Remove processed update

      debug.log(DebugCategories.STATE, 'Update processed successfully', {
        remainingUpdates: updateQueue.value.length
      })
    } catch (err) {
      debug.error(DebugCategories.ERROR, 'Failed to process update', err)
      update.reject(err)
      updateQueue.value.shift() // Remove failed update
    } finally {
      isProcessing.value = false

      // Process next update if any
      if (updateQueue.value.length > 0) {
        setTimeout(processQueue, 500) // Add delay between updates
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
        reject
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
    debug.log(DebugCategories.STATE, 'Clearing update queue', {
      queueLength: updateQueue.value.length
    })

    // Reject all pending updates
    updateQueue.value.forEach((update) => {
      update.reject(new Error('Queue cleared'))
    })

    updateQueue.value = []
    isProcessing.value = false
  }

  return {
    isProcessing,
    queueUpdate,
    clearQueue,
    queueLength: () => updateQueue.value.length
  }
}
