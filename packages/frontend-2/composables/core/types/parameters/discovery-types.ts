import type { Parameter } from './parameter-types'
import type { ProcessedHeader } from '../viewer'

/**
 * Base parameter discovery options
 */
export interface BaseParameterDiscoveryOptions {
  /**
   * Maximum number of items to process in each chunk
   * @default 50
   */
  chunkSize?: number

  /**
   * Error handling callback
   */
  onError?: (error: Error) => void
}

/**
 * Parameter discovery progress event
 */
export interface DiscoveryProgressEvent {
  processed: number
  total: number
  remaining: number
  parameters: number
}

/**
 * Base parameter discovery state
 */
export interface BaseParameterDiscoveryState {
  /**
   * Currently discovered parameters
   */
  discoveredParameters: {
    parent: Parameter[]
    child: Parameter[]
  }

  /**
   * Discovery progress
   */
  progress: DiscoveryProgressEvent

  /**
   * Whether discovery is in progress
   */
  discovering: boolean

  /**
   * Last error if any
   */
  error: Error | null
}

/**
 * Parameter discovery events
 */
export interface ParameterDiscoveryEvents {
  /**
   * Called when discovery starts
   */
  onStart?: () => void

  /**
   * Called when discovery completes
   */
  onComplete?: (parameters: Parameter[]) => void

  /**
   * Called when discovery progress updates
   */
  onProgress?: (event: DiscoveryProgressEvent) => void

  /**
   * Called when an error occurs
   */
  onError?: (error: Error) => void
}

/**
 * Parameter extraction utilities
 */
export interface ParameterExtractionUtils {
  /**
   * Convert processed header to parameter
   */
  headerToParameter: (header: ProcessedHeader) => Parameter

  /**
   * Extract parameters from raw data
   */
  extractParameters: (data: unknown, category?: string) => Promise<ProcessedHeader[]>

  /**
   * Process parameters in chunks
   */
  processInChunks: <T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    chunkSize?: number,
    onProgress?: (event: DiscoveryProgressEvent) => void
  ) => Promise<R[]>
}

/**
 * Utility type for parameter discovery implementations
 */
export type ParameterDiscoveryImplementation<
  TOptions extends BaseParameterDiscoveryOptions,
  TState extends BaseParameterDiscoveryState
> = {
  options: TOptions
  state: TState
  utils: ParameterExtractionUtils
  events?: ParameterDiscoveryEvents
}
