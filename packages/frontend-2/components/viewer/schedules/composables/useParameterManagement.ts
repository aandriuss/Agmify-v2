import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData, ParameterValue } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { evaluateParameter } from '../utils/parameterEvaluation'
import { debug, DebugCategories } from '../utils/debug'

interface UseParameterManagementOptions {
  parameters: ComputedRef<CustomParameter[]> | Ref<CustomParameter[]>
  data: ComputedRef<ElementData[]> | Ref<ElementData[]>
  isInitialized?: Ref<boolean>
}

export function useParameterManagement(options: UseParameterManagementOptions) {
  // Keep track of parameter visibility state
  const parameterVisibility = ref<Record<string, boolean>>({})

  // Convert parameters to columns with proper types and metadata
  const parameterColumns = computed<ColumnDef[]>(() => {
    debug.log(DebugCategories.PARAMETERS, 'Creating parameter columns:', {
      parameters: options.parameters.value,
      visibilityState: parameterVisibility.value
    })

    return options.parameters.value.map((param, index) => {
      const field = `param_${param.id}`
      const isVisible = parameterVisibility.value[param.id] ?? true

      return {
        field,
        header: param.name,
        type: param.type === 'equation' ? 'number' : 'string', // Equations always return numbers
        removable: param.removable ?? true,
        visible: isVisible,
        order: param.order ?? index,
        parameterRef: param.id,
        category: param.category || 'Custom Parameters',
        source: param.source || 'Parameters',
        description:
          param.type === 'equation'
            ? `Equation: ${param.equation || ''}`
            : `Fixed value: ${param.value || ''}`,
        color: param.color || 'purple'
      }
    })
  })

  // Update visibility state when parameters change
  watch(
    () => options.parameters.value,
    (newParams) => {
      const newVisibility: Record<string, boolean> = {}
      newParams.forEach((param) => {
        // Preserve existing visibility state or default to true
        newVisibility[param.id] = parameterVisibility.value[param.id] ?? true
      })
      parameterVisibility.value = newVisibility

      debug.log(DebugCategories.PARAMETERS, 'Updated parameter visibility state:', {
        parameters: newParams.length,
        visibilityState: newVisibility
      })
    }
  )

  // Evaluate parameters for each row
  const evaluatedData = computed(() => {
    debug.log(DebugCategories.PARAMETERS, 'Evaluating parameters for data:', {
      parametersCount: options.parameters.value.length,
      dataCount: options.data.value.length
    })

    return options.data.value.map((row) => {
      const paramValues: Record<string, ParameterValue> = {}
      const details = row.details

      // Create a clean row data object without details for parameter evaluation
      const rowData = { ...row }
      delete rowData.details

      // Evaluate each parameter for parent row
      for (const param of options.parameters.value) {
        try {
          const value = evaluateParameter(param, options.parameters.value, rowData)
          const field = `param_${param.id}`
          paramValues[field] = value
          debug.log(DebugCategories.PARAMETERS, 'Evaluated parameter:', {
            parameter: param.name,
            field,
            value,
            rowId: row.id
          })
        } catch (error) {
          const field = `param_${param.id}`
          paramValues[field] = param.type === 'equation' ? NaN : ''
          debug.warn(DebugCategories.PARAMETERS, 'Parameter evaluation failed:', {
            parameter: param.name,
            field,
            rowId: row.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // If row has details, evaluate parameters for each child
      if (Array.isArray(details) && details.length > 0) {
        debug.log(DebugCategories.PARAMETERS, 'Processing details:', {
          parentId: row.id,
          detailsCount: details.length
        })

        return {
          ...row,
          ...paramValues,
          details: details.map((child) => {
            const childParamValues: Record<string, ParameterValue> = {}
            // Evaluate each parameter for child row
            for (const param of options.parameters.value) {
              try {
                const value = evaluateParameter(param, options.parameters.value, child)
                const field = `param_${param.id}`
                childParamValues[field] = value
                debug.log(DebugCategories.PARAMETERS, 'Evaluated child parameter:', {
                  parameter: param.name,
                  field,
                  value,
                  childId: child.id,
                  parentId: row.id
                })
              } catch (error) {
                const field = `param_${param.id}`
                childParamValues[field] = param.type === 'equation' ? NaN : ''
                debug.warn(
                  DebugCategories.PARAMETERS,
                  'Child parameter evaluation failed:',
                  {
                    parameter: param.name,
                    field,
                    childId: child.id,
                    parentId: row.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                  }
                )
              }
            }
            return {
              ...child,
              ...childParamValues
            }
          })
        }
      }

      // Return parent row with parameter values
      return {
        ...row,
        ...paramValues
      }
    })
  })

  // Watch for changes in parameters or data
  watch(
    [
      () => options.parameters.value,
      () => options.data.value,
      () => parameterVisibility.value
    ],
    ([newParams, newData, newVisibility]) => {
      debug.log(
        DebugCategories.PARAMETERS,
        'Parameters, data, or visibility changed:',
        {
          parametersCount: newParams.length,
          dataCount: newData.length,
          visibilityState: newVisibility
        }
      )
    },
    { deep: true }
  )

  // Update parameter visibility
  function updateParameterVisibility(paramId: string, visible: boolean) {
    debug.log(DebugCategories.PARAMETERS, 'Updating parameter visibility:', {
      paramId,
      visible
    })
    parameterVisibility.value = {
      ...parameterVisibility.value,
      [paramId]: visible
    }
  }

  return {
    parameterColumns,
    evaluatedData,
    updateParameterVisibility
  }
}
