import type { Ref, ComputedRef } from 'vue'
import type { ElementData, DataState } from './index'

export interface ElementsState {
  state: ComputedRef<DataState>
  value: {
    parentElements: ElementData[]
    childElements: ElementData[]
    loading: boolean
  }
}

export interface StoreState {
  initialized: Ref<boolean>
  value: boolean
}

export interface ParameterState {
  initialized: boolean
  isProcessing: boolean
}

export function isValidElementsState(state: unknown): state is ElementsState {
  if (!state || typeof state !== 'object') return false
  return 'state' in state && 'value' in state
}

export function isValidStoreState(state: unknown): state is StoreState {
  if (!state || typeof state !== 'object') return false
  return 'initialized' in state && 'value' in state
}

export function isValidParameterState(state: unknown): state is ParameterState {
  if (!state || typeof state !== 'object') return false
  return 'initialized' in state && 'isProcessing' in state
}
