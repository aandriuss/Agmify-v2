import { computed, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import type { CustomParameter } from '~/composables/useUserSettings'
import type { ElementData } from '../types'
import type { ColumnDef } from '~/components/viewer/components/tables/DataTable/composables/columns/types'
import { evaluateParameter } from '../utils/parameterEvaluation'
import { debug } from '../utils/debug'

interface UseParameterManagementOptions {
  parameters: ComputedRef<CustomParameter[]> | Ref<CustomParameter[]>
  data: ComputedRef<ElementData[]> | Ref<ElementData[]>
  isInitialized?: Ref<boolean>
}

export function useParameterManagement(options: UseParameterManagementOptions) {
  const { isInitialized } = options

  // Keep track of parameter visibility state
  const parameterVisibility = ref<Record<string, boolean>>({})

  // Convert parameters to columns with purple color and custom category
  const parameterColumns = computed<ColumnDef[]>(() => {
    if (isInitialized?.value === false) return []

    debug.log('Creating parameter columns:', {
      parameters: options.parameters.value,
      visibilityState: parameterVisibility.value
    })

    return options.parameters.value.map((param, index) => {
      // Use parameter ID for both field and ref to ensure consistency
      const field = `param_${param.id}`
      const isVisible = parameterVisibility.value[param.id] ?? true

      return {
        field,
        header: param.name,
        type: 'number',
        removable: true,
        visible: isVisible,
        order: index,
        isCustomParameter: true,
        parameterRef: param.id,
        color: 'purple',
        category: 'Custom Parameters',
        description:
          param.type === 'equation'
            ? `Equation: ${param.equation || ''}`
            : `Fixed value: ${param.value || ''}`
      }
    })
  })

  // Update visibility state when parameters change
  watch(
    () => options.parameters.value,
    (newParams) => {
      if (isInitialized?.value === false) return

      const newVisibility: Record<string, boolean> = {}
      newParams.forEach((param) => {
        // Preserve existing visibility state or default to true
        newVisibility[param.id] = parameterVisibility.value[param.id] ?? true
      })
      parameterVisibility.value = newVisibility

      debug.log('Updated parameter visibility state:', {
        parameters: newParams.length,
        visibilityState: newVisibility
      })
    }
  )

  // Evaluate parameters for each row
  const evaluatedData = computed(() => {
    if (isInitialized?.value === false) return []

    debug.log('Evaluating parameters for data:', {
      parametersCount: options.parameters.value.length,
      dataCount: options.data.value.length
    })

    return options.data.value.map((row) => {
      const paramValues: Record<string, number> = {}
      const details = row.details

      // Create a clean row data object without details for parameter evaluation
      const rowData = { ...row }
      delete rowData.details

      // Evaluate each parameter for parent row
      for (const param of options.parameters.value) {
        try {
          const value = evaluateParameter(param, options.parameters.value, rowData)
          // Use consistent field naming
          const field = `param_${param.id}`
          paramValues[field] = value as number
          debug.log('Evaluated parameter:', {
            parameter: param.name,
            field,
            value,
            rowId: row.id
          })
        } catch (error) {
          const field = `param_${param.id}`
          paramValues[field] = NaN
          debug.warn('Parameter evaluation failed:', {
            parameter: param.name,
            field,
            rowId: row.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // If row has details, evaluate parameters for each child
      if (Array.isArray(details) && details.length > 0) {
        debug.log('Processing details:', {
          parentId: row.id,
          detailsCount: details.length
        })

        return {
          ...row,
          ...paramValues,
          details: details.map((child) => {
            const childParamValues: Record<string, number> = {}
            // Evaluate each parameter for child row
            for (const param of options.parameters.value) {
              try {
                const value = evaluateParameter(param, options.parameters.value, child)
                const field = `param_${param.id}`
                childParamValues[field] = value as number
                debug.log('Evaluated child parameter:', {
                  parameter: param.name,
                  field,
                  value,
                  childId: child.id,
                  parentId: row.id
                })
              } catch (error) {
                const field = `param_${param.id}`
                childParamValues[field] = NaN
                debug.warn('Child parameter evaluation failed:', {
                  parameter: param.name,
                  field,
                  childId: child.id,
                  parentId: row.id,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
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
      if (isInitialized?.value === false) return

      debug.log('Parameters, data, or visibility changed:', {
        parametersCount: newParams.length,
        dataCount: newData.length,
        visibilityState: newVisibility
      })
    },
    { deep: true }
  )

  // Update parameter visibility
  function updateParameterVisibility(paramId: string, visible: boolean) {
    if (isInitialized?.value === false) return

    debug.log('Updating parameter visibility:', {
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
