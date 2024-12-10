/**
 * Base error class for all application errors
 */
export class ApplicationError extends Error {
  constructor(message: string, public override cause?: unknown) {
    super(message)
    this.name = 'ApplicationError'
  }
}

/**
 * Base validation error class
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, public details?: unknown) {
    super(message, details)
    this.name = 'ValidationError'
  }
}

/**
 * Initialization error class
 */
export class InitializationError extends ApplicationError {
  constructor(message: string, public recoverable: boolean = true) {
    super(message)
    this.name = 'InitializationError'
  }
}

/**
 * Base table error class
 */
export class TableError extends ApplicationError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'TableError'
  }
}

/**
 * Table state error class
 */
export class TableStateError extends TableError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'TableStateError'
  }
}

/**
 * Column error class
 */
export class ColumnError extends TableError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'ColumnError'
  }
}

/**
 * Selection error class
 */
export class SelectionError extends TableError {
  constructor(message: string, cause?: unknown) {
    super(message, cause)
    this.name = 'SelectionError'
  }
}

/**
 * Parameter validation error class
 */
export class ParameterValidationError extends ValidationError {
  constructor(message: string, public parameterId: string, details?: unknown) {
    super(message, details)
    this.name = 'ParameterValidationError'
  }
}

/**
 * Table validation error class
 */
export class TableValidationError extends ValidationError {
  constructor(message: string, public tableId: string, details?: unknown) {
    super(message, details)
    this.name = 'TableValidationError'
  }
}

/**
 * Creates an error handler function
 */
export function createErrorHandler(
  ErrorClass: typeof ApplicationError,
  onError?: (error: Error) => void
) {
  return (err: unknown) => {
    const error =
      err instanceof Error
        ? new ErrorClass(err.message, err)
        : new ErrorClass('Unknown error occurred')
    onError?.(error)
    throw error
  }
}
