/**
 * Base validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: unknown) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Initialization error class
 */
export class InitializationError extends Error {
  constructor(message: string, public recoverable: boolean = true) {
    super(message)
    this.name = 'InitializationError'
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
