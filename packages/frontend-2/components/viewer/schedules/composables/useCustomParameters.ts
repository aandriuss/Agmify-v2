import { ref, computed } from 'vue'
import type { BIMNode } from '../types'
import type { CustomParameter } from '~/composables/useUserSettings'
import { debug } from '../utils/debug'

export interface EvaluationContext {
  node: BIMNode
  parameters: Record<string, unknown>
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

export function useCustomParameters() {
  const customParameters = ref<CustomParameter[]>([])

  function addParameter(parameter: Omit<CustomParameter, 'field' | 'header'>) {
    const newParameter: CustomParameter = {
      ...parameter,
      field: parameter.name, // Use name as field
      header: parameter.name, // Use name as header
      category: 'Custom Parameters',
      removable: true,
      visible: true
    }
    customParameters.value.push(newParameter)
    debug.log('Added custom parameter:', newParameter)
  }

  function removeParameter(id: string) {
    const index = customParameters.value.findIndex((p) => p.id === id)
    if (index !== -1) {
      const removed = customParameters.value.splice(index, 1)
      debug.log('Removed custom parameter:', removed[0])
    }
  }

  function updateParameter(id: string, updates: Partial<CustomParameter>) {
    const parameter = customParameters.value.find((p) => p.id === id)
    if (parameter) {
      // If name is updated, update field and header too
      if (updates.name) {
        updates.field = updates.name
        updates.header = updates.name
      }
      Object.assign(parameter, updates)
      debug.log('Updated custom parameter:', {
        id,
        updates,
        parameter
      })
    }
  }

  function evaluateEquation(equation: string, context: EvaluationContext): unknown {
    try {
      // Create a safe evaluation context with access to parameters and math functions
      const evalContext: EvalContextType = {
        parameters: context.parameters,
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

      // Replace parameter references with context values
      const evaluatedEquation = equation.replace(
        /\${([^}]+)}/g,
        (_, param) => `context.parameters['${param}']`
      )

      // Create a function that evaluates the equation in the context
      const fn = new Function('context', `return ${evaluatedEquation}`) as (
        context: EvalContextType
      ) => number
      const result = fn(evalContext)
      debug.log('Evaluated equation:', {
        equation,
        result,
        context: evalContext
      })
      return result
    } catch (error) {
      debug.error('Error evaluating equation:', {
        equation,
        error: error instanceof Error ? error.message : 'Unknown error',
        context
      })
      return null
    }
  }

  function evaluateParameter(
    parameter: CustomParameter,
    context: EvaluationContext
  ): unknown {
    if (parameter.type === 'fixed') {
      return parameter.value || ''
    }
    return parameter.value ? evaluateEquation(parameter.value, context) : null
  }

  const parameters = computed(() => customParameters.value)

  return {
    parameters,
    addParameter,
    removeParameter,
    updateParameter,
    evaluateParameter
  }
}
