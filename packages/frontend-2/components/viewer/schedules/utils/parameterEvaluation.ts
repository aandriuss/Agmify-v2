import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData } from '../types'
import { debug } from './debug'

export class EquationError extends Error {
  constructor(message: string, public details?: Record<string, unknown>) {
    super(message)
    this.name = 'EquationError'
  }
}

interface SafeMathFunctions {
  abs: (x: number) => number
  ceil: (x: number) => number
  floor: (x: number) => number
  round: (x: number) => number
  max: (...values: number[]) => number
  min: (...values: number[]) => number
  pow: (x: number, y: number) => number
  sqrt: (x: number) => number
}

interface EvalContextType {
  parameters: Record<string, unknown>
  Math: SafeMathFunctions
}

export function evaluateParameter(
  parameter: CustomParameter,
  allParameters: CustomParameter[],
  rowData: ElementData
): number | null {
  try {
    debug.startState('parameterEvaluation')
    debug.log('Evaluating parameter:', {
      parameter,
      rowData
    })

    // For fixed type parameters, convert value to number
    if (parameter.type === 'fixed') {
      const value = parameter.value ? Number(parameter.value) : null
      if (value === null || isNaN(value)) {
        throw new EquationError('Invalid fixed value', {
          value: parameter.value,
          parameter
        })
      }
      debug.log('Fixed parameter value:', value)
      debug.completeState('parameterEvaluation')
      return value
    }

    // For equation type parameters, evaluate the equation
    if (parameter.type === 'equation' && parameter.value) {
      // Create evaluation context with row data and math functions
      const evalContext: EvalContextType = {
        parameters: {
          ...rowData,
          // Add values from other parameters
          ...allParameters.reduce((acc, param) => {
            if (param.type === 'fixed' && param.value) {
              const value = Number(param.value)
              if (!isNaN(value)) {
                acc[param.name] = value
              }
            }
            return acc
          }, {} as Record<string, number>)
        },
        Math: {
          abs: Math.abs,
          ceil: Math.ceil,
          floor: Math.floor,
          round: Math.round,
          max: Math.max,
          min: Math.min,
          pow: Math.pow,
          sqrt: Math.sqrt
        }
      }

      debug.log('Evaluation context:', evalContext)

      // Replace parameter references with context values
      const evaluatedEquation = parameter.value.replace(/\${([^}]+)}/g, (_, param) => {
        if (!evalContext.parameters.hasOwnProperty(param)) {
          throw new EquationError(`Parameter "${param}" not found`, {
            parameter: param,
            availableParameters: Object.keys(evalContext.parameters)
          })
        }
        return `context.parameters['${param}']`
      })

      debug.log('Evaluated equation:', evaluatedEquation)

      // Create a function that evaluates the equation in the context
      let fn: (context: EvalContextType) => number
      try {
        fn = new Function('context', `return ${evaluatedEquation}`) as (
          context: EvalContextType
        ) => number
      } catch (error) {
        throw new EquationError('Invalid equation syntax', {
          equation: parameter.value,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }

      const result = fn(evalContext)
      if (isNaN(result)) {
        throw new EquationError('Equation resulted in NaN', {
          equation: parameter.value,
          evaluatedEquation,
          context: evalContext
        })
      }

      debug.log('Equation result:', result)
      debug.completeState('parameterEvaluation')
      return result
    }

    throw new EquationError('Invalid parameter type or missing value', {
      parameter,
      type: parameter.type,
      value: parameter.value
    })
  } catch (error) {
    if (error instanceof EquationError) {
      debug.error('Parameter evaluation error:', {
        message: error.message,
        details: error.details
      })
      throw error
    }

    const wrappedError = new EquationError('Parameter evaluation failed', {
      parameter,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    debug.error('Parameter evaluation error:', wrappedError)
    debug.completeState('parameterEvaluation')
    throw wrappedError
  }
}
