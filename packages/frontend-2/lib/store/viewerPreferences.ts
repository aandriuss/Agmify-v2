import { useSynchronizedCookie } from '~/lib/common/composables/reactiveCookie'
import { CookieKeys } from '~/lib/common/helpers/constants'
import type { Optional } from '@speckle/shared'

interface TableColumnConfig {
  field: string
  header: string
  visible: boolean
  removable?: boolean
}

export function useViewerPreferences() {
  // Table preferences
  const tableConfigCookie = useSynchronizedCookie<
    Optional<Record<string, TableColumnConfig[]>>
  >(CookieKeys.TablePreferences)

  const setTableConfig = (tableId: string, config: TableColumnConfig[]) => {
    const currentConfigs = tableConfigCookie.value || {}
    currentConfigs[tableId] = config
    tableConfigCookie.value = currentConfigs
  }

  const getTableConfig = (tableId: string) => {
    return tableConfigCookie.value?.[tableId]
  }

  // Panel width preference - single width for all panels
  const panelWidthCookie = useSynchronizedCookie<Optional<number>>(
    CookieKeys.ViewerPanelWidth
  )

  const setPanelWidth = (_panelId: string, width: number) => {
    panelWidthCookie.value = width
  }

  const getPanelWidth = (_panelId: string): number => {
    return panelWidthCookie.value || 600
  }

  return {
    setTableConfig,
    getTableConfig,
    setPanelWidth,
    getPanelWidth
  }
}
