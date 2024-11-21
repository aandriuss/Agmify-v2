import { ref, computed, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { debug, DebugCategories } from '../../utils/debug'
import store from '../../composables/useScheduleStore'
import { useUserSettings } from '~/composables/useUserSettings'
import type { NamedTableConfig } from '~/composables/useUserSettings'
import type { Store } from '../types'
import type { ProcessedHeader } from '../../types'
import type { ParameterDefinition } from '~/components/viewer/components/tables/DataTable/composables/parameters/parameterManagement'
import { useInjectedViewerState } from '~~/lib/viewer/composables/setup'
import { defaultColumns } from '../../config/defaultColumns'
import { useBIMElements } from '../../composables/useBIMElements'
import { discoverParameters } from '../../features/parameters/discovery'

export interface InitializationState {
  isInitialized: boolean
  isLoading: boolean
  error: InitializationError | null
  projectId: string | null
  settings: Record<string, NamedTableConfig> | null
}

export interface InitializationFlow {
  state: Ref<InitializationState>
  initialize: () => Promise<void>
  retry: () => Promise<void>
  cleanup: () => Promise<void>
}

export class InitializationError extends Error {
  public readonly recoverable: boolean

  constructor(message: string, recoverable = true) {
    super(message)
    this.name = 'InitializationError'
    this.recoverable = recoverable
  }
}

function assertStore(store: unknown): asserts store is Store {
  if (!store || typeof store !== 'object') {
    throw new InitializationError('Store not available', false)
  }

  const storeObj = store as Store
  if (typeof storeObj.setProjectId !== 'function' || !storeObj.lifecycle?.init) {
    throw new InitializationError('Store not properly initialized', false)
  }
}

// Convert ParameterDefinition to ProcessedHeader
function toProcessedHeader(param: ParameterDefinition): ProcessedHeader {
  const group = param.category || 'Parameters'
  return {
    field: param.field,
    header: param.header,
    type:
      param.type === 'number'
        ? 'number'
        : param.type === 'boolean'
        ? 'boolean'
        : 'string',
    category: param.category || 'Parameters',
    description: param.description || `Parameter ${param.header}`,
    fetchedGroup: group,
    currentGroup: group,
    isFetched: true,
    source: group
  }
}

export function useScheduleInitializationFlow(): InitializationFlow {
  const route = useRoute()
  const viewerState = useInjectedViewerState()
  const { initializeElements, allElements } = useBIMElements()

  // State management
  const state = ref<InitializationState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    projectId: null,
    settings: null
  })

  // Project ID validation - prioritize viewer state
  const projectId = computed(() => {
    // First try to get project ID from viewer state
    if (viewerState.projectId?.value) {
      debug.log(
        DebugCategories.INITIALIZATION,
        'Using project ID from viewer state:',
        viewerState.projectId.value
      )
      return viewerState.projectId.value
    }

    // Fallback to route if needed
    const fullPath = route.fullPath
    const match = fullPath.match(/\/projects\/([^/]+)/)
    const id = match ? match[1] : route.params.projectId

    debug.log(DebugCategories.INITIALIZATION, 'Project ID resolution:', {
      fromViewer: viewerState.projectId?.value,
      fromRoute: id,
      routeParams: route.params,
      fullPath: route.fullPath
    })

    return typeof id === 'string' && id ? id : null
  })

  // Settings initialization with error handling
  async function initializeSettings(): Promise<Record<
    string,
    NamedTableConfig
  > | null> {
    try {
      const settings = useUserSettings()
      await settings.loadSettings()
      return settings.settings.value?.namedTables || null
    } catch (err) {
      debug.warn(
        DebugCategories.INITIALIZATION,
        'Failed to initialize settings, continuing without them:',
        err
      )
      return null
    }
  }

  // Get active parameters from settings or defaults
  function getActiveParameters(
    settings: Record<string, NamedTableConfig> | null
  ): string[] {
    // Try to get from settings
    if (settings) {
      const currentTable = Object.values(settings)[0] // Use first table for now
      if (currentTable) {
        const activeParams = [
          ...currentTable.parentColumns,
          ...currentTable.childColumns
        ].map((col) => col.field)

        debug.log(DebugCategories.PARAMETERS, 'Using active parameters from settings', {
          count: activeParams.length,
          parameters: activeParams
        })

        return activeParams
      }
    }

    // Fallback to defaults
    const defaultParams = defaultColumns.map((col) => col.field)
    debug.log(DebugCategories.PARAMETERS, 'Using default active parameters', {
      count: defaultParams.length,
      parameters: defaultParams
    })

    return defaultParams
  }

  // Core initialization with proper error handling
  async function initializeCore(): Promise<void> {
    if (!projectId.value) {
      throw new InitializationError('Project ID is required but not provided', false)
    }

    if (!viewerState?.viewer?.instance) {
      throw new InitializationError('Viewer state not available', false)
    }

    try {
      // Wait for viewer initialization first
      await viewerState.viewer.init.promise

      // Validate store
      assertStore(store)

      // Initialize store with project ID
      store.setProjectId(projectId.value)

      // Load settings before store initialization
      const settings = await initializeSettings()
      state.value.settings = settings

      // Get active parameters
      const activeParameters = getActiveParameters(settings)

      // Initialize store lifecycle
      await store.lifecycle.init()

      // Initialize BIM elements with active parameters
      await initializeElements(activeParameters)

      // Initialize with all elements as parents
      await store.lifecycle.update({
        scheduleData: allElements.value.map((el) => ({ ...el, isChild: false })),
        parameterColumns: defaultColumns,
        selectedParentCategories: [],
        selectedChildCategories: []
      })

      // Discover all available parameters for parameter manager
      const discoveredParameters = await discoverParameters(allElements.value)
      const processedHeaders = discoveredParameters.map(toProcessedHeader)

      await store.lifecycle.update({
        availableHeaders: {
          parent: processedHeaders,
          child: processedHeaders
        }
      })

      // Update state
      state.value.projectId = projectId.value
      state.value.isInitialized = true
      state.value.error = null

      debug.log(DebugCategories.INITIALIZATION, 'Core initialization complete', {
        projectId: projectId.value,
        hasSettings: !!settings,
        viewerReady: !!viewerState?.viewer?.instance,
        storeInitialized: store.initialized.value,
        scheduleDataLength: store.scheduleData.value.length,
        parameterColumnsLength: store.parameterColumns.value.length,
        activeParameters,
        availableParametersCount: processedHeaders.length
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      debug.error(DebugCategories.ERROR, 'Core initialization failed:', error)
      throw new InitializationError(error.message)
    }
  }

  // Main initialization flow with retry logic
  async function initialize(): Promise<void> {
    if (state.value.isLoading) {
      debug.log(DebugCategories.INITIALIZATION, 'Initialization already in progress')
      return
    }

    try {
      state.value.isLoading = true
      state.value.error = null

      debug.startState('scheduleInitialization')
      debug.log(DebugCategories.INITIALIZATION, 'Starting initialization flow', {
        timestamp: new Date().toISOString(),
        projectId: projectId.value,
        viewerState: !!viewerState?.viewer?.instance
      })

      await initializeCore()

      debug.completeState('scheduleInitialization')
    } catch (err) {
      const error =
        err instanceof InitializationError ? err : new InitializationError(String(err))
      state.value.error = error
      state.value.isInitialized = false
      debug.error(DebugCategories.ERROR, 'Initialization failed:', error)
      throw error
    } finally {
      state.value.isLoading = false
    }
  }

  // Retry mechanism with backoff
  async function retry(): Promise<void> {
    if (state.value.isLoading) return
    if (!state.value.error?.recoverable) {
      debug.error(DebugCategories.ERROR, 'Cannot retry - error is not recoverable')
      return
    }

    const backoffTime = 1000
    debug.log(DebugCategories.INITIALIZATION, 'Retrying initialization', {
      backoffTime
    })

    await new Promise((resolve) => setTimeout(resolve, backoffTime))
    await initialize()
  }

  // Cleanup
  async function cleanup(): Promise<void> {
    debug.startState('cleanup')
    debug.log(DebugCategories.STATE, 'Cleaning up initialization flow')

    try {
      assertStore(store)
      await store.lifecycle.cleanup()
    } catch (err) {
      debug.warn(DebugCategories.STATE, 'Cleanup error:', err)
    }

    state.value = {
      isInitialized: false,
      isLoading: false,
      error: null,
      projectId: null,
      settings: null
    }

    debug.completeState('cleanup')
  }

  return {
    state,
    initialize,
    retry,
    cleanup
  }
}
