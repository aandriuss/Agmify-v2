import type { AvailableUserParameter } from '~/composables/core/types'

export interface UserParameterStoreState {
  parameters: Record<string, AvailableUserParameter>
  loading: boolean
  error: Error | null
  lastUpdated: number
  initialized: boolean
}

export interface UserParameterStore {
  // State
  state: Ref<UserParameterStoreState>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  hasError: Ref<boolean>
  lastUpdated: Ref<number>

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
  initialize(): Promise<void>
  reset(): void
}

export interface UserParameterStoreOptions {
  initialParameters?: Record<string, AvailableUserParameter>
}
