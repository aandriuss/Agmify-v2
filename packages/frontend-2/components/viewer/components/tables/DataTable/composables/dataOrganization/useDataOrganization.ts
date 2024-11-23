import { ref } from 'vue'
import { ViewerEvent } from '@speckle/viewer'
import { useViewerEventListener } from '~~/lib/viewer/composables/viewer'
import { debug, DebugCategories } from '~/components/viewer/schedules/debug/useDebug'

/**
 * This composable has been refactored to remove direct world tree access.
 * Data should now come from the store instead of being fetched directly.
 */
export function useDataOrganization() {
  const expandLevel = ref(-1)
  const refhack = ref(1)

  useViewerEventListener(ViewerEvent.Busy, (isBusy: boolean) => {
    if (isBusy) return
    refhack.value++
  })

  debug.log(DebugCategories.DATA, 'Data organization initialized', {
    message: 'Using store data instead of direct world tree access'
  })

  return { expandLevel }
}
