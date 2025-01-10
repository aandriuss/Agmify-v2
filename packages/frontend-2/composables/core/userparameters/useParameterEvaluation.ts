import { computed } from 'vue'
import type { Ref } from 'vue'
import { debug, DebugCategories } from '~/composables/core/utils/debug'
import type { UserParameter } from '~/composables/core/types'

interface UseParameterEvaluationOptions {
  parameters: Ref<UserParameter[]>
}

export interface EvaluatedParameter extends UserParameter {
  evaluatedValue: string
}

export class ParameterEvaluationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParameterEvaluationError'
  }
}

/**
 * Parameter evaluation hook
 * Handles evaluation of parameter values and equations
 */
export function useParameterEvaluation({ parameters }: UseParameterEvaluationOptions) {
  const evaluateParameter = (param: UserParameter): string => {
    try {
      debug.startState(DebugCategories.PARAMETERS, 'Evaluating parameter', {
        parameterId: param.id,
        type: param.type
      })

      if (param.type === 'fixed') {
        const value = param.value?.toString() || 'N/A'
        debug.log(DebugCategories.PARAMETERS, 'Fixed value evaluation', { value })
        return value
      }

      if (!param.equation) {
        debug.log(DebugCategories.PARAMETERS, 'No equation provided')
        return 'N/A'
      }

      // Create a map of parameter values for equation evaluation
      const parameterValues = new Map<string, number>()
      parameters.value.forEach((p) => {
        if (p.type === 'fixed' && p.value !== undefined && p.value !== null) {
          const numValue = Number(p.value)
          if (!isNaN(numValue)) {
            parameterValues.set(p.name, numValue)
          }
        }
      })

      debug.log(DebugCategories.PARAMETERS, 'Parameter values for equation', {
        values: Object.fromEntries(parameterValues)
      })

      // Basic equation evaluation - you might want to use a proper equation parser
      const equationWithValues = param.equation.replace(/\b(\w+)\b/g, (match) =>
        parameterValues.has(match) ? parameterValues.get(match)!.toString() : match
      )

      debug.log(DebugCategories.PARAMETERS, 'Equation with values', {
        equation: equationWithValues
      })

      // Using Function constructor for equation evaluation
      // Note: In production, you might want a more secure evaluation method
      const result: unknown = new Function(`return ${equationWithValues}`)()

      if (typeof result !== 'number' || !isFinite(result)) {
        throw new ParameterEvaluationError('Invalid equation result')
      }

      debug.completeState(
        DebugCategories.PARAMETERS,
        'Parameter evaluated successfully'
      )
      return result.toString()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown evaluation error'
      debug.error(DebugCategories.ERROR, 'Parameter evaluation error:', message)
      return 'Error evaluating'
    }
  }

  const evaluatedParameters = computed<EvaluatedParameter[]>(() =>
    parameters.value.map((param) => ({
      ...param,
      evaluatedValue: evaluateParameter(param)
    }))
  )

  return {
    evaluateParameter,
    evaluatedParameters
  }
}
