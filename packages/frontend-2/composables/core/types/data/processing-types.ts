/**
 * Processing state interface
 */
export interface ProcessingState {
  isProcessingElements: boolean
  processedCount: number
  totalCount: number
  error?: Error
  isProcessingFullData: boolean
}
