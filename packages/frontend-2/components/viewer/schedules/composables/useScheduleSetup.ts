import { debug, DebugCategories } from '../debug/useDebug'
import type { ViewerState } from '../types/viewer'
import scheduleStore, { initializeStore } from './useScheduleStore'

export interface ScheduleSetupResult {
  initialized: boolean
  error: Error | null
}

export async function initializeSchedules(
  state: ViewerState
): Promise<ScheduleSetupResult> {
  debug.log(DebugCategories.INITIALIZATION, 'Initializing schedules')

  try {
    // Initialize store with viewer state first
    debug.log(DebugCategories.INITIALIZATION, 'Initializing store with viewer state')
    initializeStore(state)

    // Set project ID if available
    if (!state?.projectId?.value) {
      throw new Error('Project ID is required but not provided')
    }

    debug.log(
      DebugCategories.INITIALIZATION,
      'Setting project ID:',
      state.projectId.value
    )
    scheduleStore.setProjectId(state.projectId.value)

    // Initialize store
    debug.log(DebugCategories.INITIALIZATION, 'Initializing store')
    await scheduleStore.lifecycle.init()

    debug.log(DebugCategories.INITIALIZATION, 'Schedules initialized')

    return {
      initialized: true,
      error: null
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    debug.error(DebugCategories.ERROR, 'Failed to initialize schedules:', error)
    return {
      initialized: false,
      error
    }
  }
}
