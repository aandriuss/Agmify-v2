import type { TableSettings } from '../../tables/store/types'

export interface TableState {
  state: {
    value: {
      tables: Record<string, TableSettings>
    }
  }
}

interface StateObject {
  state: {
    value: {
      tables: Record<string, unknown>
    }
  }
}

export function isValidTableState(state: unknown): state is TableState {
  if (!state || typeof state !== 'object') return false

  const candidate = state as Partial<StateObject>

  return (
    'state' in candidate &&
    typeof candidate.state === 'object' &&
    candidate.state !== null &&
    'value' in candidate.state &&
    typeof candidate.state.value === 'object' &&
    candidate.state.value !== null &&
    'tables' in candidate.state.value &&
    typeof candidate.state.value.tables === 'object'
  )
}
