export interface CategoryDefinition {
  id: string
  name: string
  parent?: string
  type: 'parent' | 'child'
  validation?: (value: unknown) => boolean
}

export interface ParameterDefinition {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'date'
  validation: (value: unknown) => boolean
}

// Validation and Error types
export class ValidationError extends Error {
  constructor(public paramId: string, public value: unknown, message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class InitializationError extends Error {
  constructor(message: string, public recoverable: boolean = true) {
    super(message)
    this.name = 'InitializationError'
  }
}
