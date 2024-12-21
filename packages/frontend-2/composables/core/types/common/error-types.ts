/**
 * Extended Error interface with additional properties
 */
export interface AppError extends Error {
  code?: string
  details?: unknown
}

/**
 * Error data structure for logging and display
 */
export interface ErrorData {
  message: string
  code?: string
  details?: unknown
  stack?: string
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error
}

/**
 * Create an AppError from unknown error
 */
export function createAppError(err: unknown): AppError {
  if (isAppError(err)) return err
  return new Error(typeof err === 'string' ? err : 'Unknown error')
}

/**
 * Convert AppError to ErrorData
 */
export function createErrorData(error: AppError): ErrorData {
  return {
    message: error.message,
    code: error.code,
    details: error.details,
    stack: error.stack
  }
}
