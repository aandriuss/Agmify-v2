export class ParameterError extends Error {
  override cause?: Error

  constructor(message: string, cause?: Error) {
    super(message)
    this.name = 'ParameterError'
    this.cause = cause
  }
}

export class ParameterNotFoundError extends ParameterError {
  constructor(id: string) {
    super(`Parameter not found: ${id}`)
    this.name = 'ParameterNotFoundError'
  }
}

export class ParameterValidationError extends ParameterError {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterValidationError'
  }
}

export class ParameterDuplicateError extends ParameterError {
  constructor(name: string, group: string) {
    super(`Parameter with name "${name}" already exists in group "${group}"`)
    this.name = 'ParameterDuplicateError'
  }
}

export class ParameterOperationError extends ParameterError {
  constructor(operation: string, message: string, cause?: Error) {
    super(`Failed to ${operation} parameter: ${message}`, cause)
    this.name = 'ParameterOperationError'
  }
}
