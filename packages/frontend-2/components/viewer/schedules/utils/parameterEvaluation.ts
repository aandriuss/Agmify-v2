import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData, ParameterValue } from '../types'
import { debug, DebugCategories } from './debug'

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
): ParameterValue {
  try {
    debug.startState('parameterEvaluation')
    debug.log(DebugCategories.PARAMETERS, 'Evaluating parameter:', {
      parameter,
      rowData
    })

    // For fixed type parameters, return value as is
    if (parameter.type === 'fixed') {
      const value = parameter.value || ''
      debug.log(DebugCategories.PARAMETERS, 'Fixed parameter value:', value)
      debug.completeState('parameterEvaluation')
      return value
    }

    // For equation type parameters, evaluate the equation
    if (parameter.type === 'equation') {
      if (!parameter.equation) {
        debug.warn(DebugCategories.PARAMETERS, 'Empty equation, returning 0')
        return 0
      }

      // Create evaluation context with row data and math functions
      const evalContext: EvalContextType = {
        parameters: {
          ...rowData,
          // Add values from other parameters
          ...allParameters.reduce((acc, param) => {
            if (param.type === 'fixed' && param.value) {
              // Try to convert fixed values to numbers for equations
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

      debug.log(DebugCategories.PARAMETERS, 'Evaluation context:', evalContext)

      // Replace parameter references with context values
      const evaluatedEquation = parameter.equation.replace(
        /\${([^}]+)}/g,
        (_, paramName: string) => {
          if (
            !Object.prototype.hasOwnProperty.call(evalContext.parameters, paramName)
          ) {
            throw new EquationError(`Parameter "${paramName}" not found`, {
              parameter: paramName,
              availableParameters: Object.keys(evalContext.parameters)
            })
          }
          return `context.parameters['${paramName}']`
        }
      )

      debug.log(DebugCategories.PARAMETERS, 'Evaluated equation:', evaluatedEquation)

      // Create a function that evaluates the equation in the context
      let fn: (context: EvalContextType) => number
      try {
        fn = new Function('context', `return ${evaluatedEquation}`) as (
          context: EvalContextType
        ) => number
      } catch (error) {
        debug.error(DebugCategories.PARAMETERS, 'Equation syntax error:', {
          equation: parameter.equation,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        return NaN
      }

      try {
        const result = fn(evalContext)
        if (isNaN(result)) {
          debug.warn(DebugCategories.PARAMETERS, 'Equation resulted in NaN:', {
            equation: parameter.equation,
            evaluatedEquation,
            context: evalContext
          })
          return NaN
        }

        debug.log(DebugCategories.PARAMETERS, 'Equation result:', result)
        debug.completeState('parameterEvaluation')
        return result
      } catch (error) {
        debug.error(DebugCategories.PARAMETERS, 'Equation evaluation error:', {
          equation: parameter.equation,
          evaluatedEquation,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        return NaN
      }
    }

    debug.warn(DebugCategories.PARAMETERS, 'Invalid parameter type:', {
      parameter,
      type: parameter.type
    })
    return parameter.type === 'equation' ? NaN : ''
  } catch (error) {
    debug.error(DebugCategories.PARAMETERS, 'Parameter evaluation error:', {
      parameter,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    debug.completeState('parameterEvaluation')
    return parameter.type === 'equation' ? NaN : ''
  }
}
