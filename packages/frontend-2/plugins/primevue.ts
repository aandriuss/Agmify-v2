// frontend/plugins/primevue.ts
import { defineNuxtPlugin } from '#app'
import PrimeVue from 'primevue/config'
import DataTable from 'primevue/datatable'
import { CommonBadge } from '@speckle/ui-components'
import '~/assets/prime-vue.css'

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
  nuxtApp.vueApp.component('CommonBadge', CommonBadge)
})
