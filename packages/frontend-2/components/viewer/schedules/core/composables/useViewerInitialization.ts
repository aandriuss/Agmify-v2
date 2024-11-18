import { type Ref } from 'vue'
import type { Viewer } from '@speckle/viewer'

export class ViewerInitializationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ViewerInitializationError'
  }
}

// This is just a type helper for schedule initialization
export interface ViewerState {
  viewer: {
    instance: Viewer | null
    init: {
      ref: Ref<boolean>
      promise: Promise<void>
    }
    metadata: {
      worldTree: Ref<unknown>
    }
  } | null
}
