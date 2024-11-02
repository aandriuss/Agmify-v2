// Import required PrimeVue components and styles
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Menu from 'primevue/menu'

// Import PrimeVue styles
import 'primevue/resources/themes/lara-light-blue/theme.css'
import 'primevue/resources/primevue.min.css'
import 'primeicons/primeicons.css'

export function setupPrimeVue(app: any) {
  // Install PrimeVue
  app.use(PrimeVue, {
    ripple: true
  })

  // Register PrimeVue components
  app.component('Button', Button)
  app.component('Checkbox', Checkbox)
  app.component('DataTable', DataTable)
  app.component('Column', Column)
  app.component('Menu', Menu)
}
