/**
 * Store error types
 */
export class StoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'StoreError'
  }
}

export class StoreInitializationError extends StoreError {
  constructor(message: string) {
    super(message)
    this.name = 'StoreInitializationError'
  }
}

export class StoreUpdateError extends StoreError {
  constructor(message: string) {
    super(message)
    this.name = 'StoreUpdateError'
  }
}

export class StoreProcessingError extends StoreError {
  constructor(message: string) {
    super(message)
    this.name = 'StoreProcessingError'
  }
}
