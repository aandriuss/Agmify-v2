import { defineNuxtPlugin } from '#app'
import PrimeVue from 'primevue/config'
import DataTable from 'primevue/datatable'
import { CommonBadge } from '@speckle/ui-components'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {
    ripple: true,
    locale: {
      aria: {
        expandRow: 'Expand row',
        collapseRow: 'Collapse row'
      }
    }
  })
  nuxtApp.vueApp.component('DataTable', DataTable)
  // Register Speckle's CommonBadge component globally
  nuxtApp.vueApp.component('CommonBadge', CommonBadge)
})
