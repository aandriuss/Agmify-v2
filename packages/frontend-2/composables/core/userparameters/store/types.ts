import type { ComputedRef } from 'vue'
import type { AvailableUserParameter } from '~/composables/core/types'

export interface UserParameterStoreState {
  parameters: Record<string, AvailableUserParameter>
  loading: boolean
  error: Error | null
  lastUpdated: number
}

export interface UserParameterStore {
  // State
  state: ComputedRef<UserParameterStoreState>
  isLoading: ComputedRef<boolean>
  error: ComputedRef<Error | null>
  hasError: ComputedRef<boolean>
  lastUpdated: ComputedRef<number>

  // Core operations
  createParameter(
    parameter: Omit<AvailableUserParameter, 'id'>
  ): Promise<AvailableUserParameter>
  updateParameter(
    id: string,
    updates: Partial<Omit<AvailableUserParameter, 'id' | 'kind'>>
  ): Promise<AvailableUserParameter>
  deleteParameter(id: string): Promise<void>
  loadParameters(): Promise<Record<string, AvailableUserParameter>>

  // Store management
  reset(): void
}
