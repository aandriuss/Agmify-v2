import { computed } from 'vue'
import type { Ref } from 'vue'
import type { CustomParameter } from '~/composables/core/types'

interface UseParameterEvaluationOptions {
  parameters: Ref<CustomParameter[]>
}

export function useParameterEvaluation({ parameters }: UseParameterEvaluationOptions) {
  const evaluateParameter = (param: CustomParameter): string => {
    try {
      if (param.type === 'fixed') {
        return param.value || 'N/A'
      }

      if (!param.equation) {
        return 'N/A'
      }

      // Create a map of parameter values for equation evaluation
      const parameterValues = new Map<string, number>()
      parameters.value.forEach((p) => {
        if (p.type === 'fixed' && p.value) {
          parameterValues.set(p.name, Number(p.value))
        }
      })

      // Basic equation evaluation - you might want to use a proper equation parser
      const equationWithValues = param.equation.replace(/\b(\w+)\b/g, (match) =>
        parameterValues.has(match) ? parameterValues.get(match)!.toString() : match
      )

      // Using Function constructor for equation evaluation
      // Note: In production, you might want a more secure evaluation method
      const result = new Function(`return ${equationWithValues}`)()
      return typeof result === 'number' ? result.toString() : 'Error'
    } catch (err) {
      console.error('Parameter evaluation error:', err)
      return 'Error evaluating'
    }
  }

  const evaluatedParameters = computed(() =>
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
