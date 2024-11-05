import type { Plugin } from 'vue'
import { useTableRegistry } from './stores/tableRegistry'
import { defaultTableTypes } from './configs/defaultConfigs'

export const TablePlugin: Plugin = {
  install(app) {
    const registry = useTableRegistry()

    // Register default table types
    Object.entries(defaultTableTypes).forEach(([type, settings]) => {
      registry.registerTypeSettings(type, settings)
    })
  }
}
