// This composable has been deprecated.
// Selected parameters are now managed by the table store.
// Use useTableStore() for parameter management.

import { useTableStore } from '../store/store'

export function useTableParameters() {
  return useTableStore()
}
