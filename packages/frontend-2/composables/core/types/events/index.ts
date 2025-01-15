import type {
  TableEventPayloads,
  ParameterEventPayloads,
  ScheduleEventPayloads
} from './table-events'
/**
 * Re-exports all event types and utilities
 */

// Base event types
export * from './base-events'

// Table-specific event types
export * from './table-events'

// Event utilities
export {
  isTableEvent,
  isParameterEvent,
  isScheduleEvent,
  createEvent
} from './table-events'

/**
 * Type assertion utilities
 */
export function assertEventType<T>(
  event: unknown,
  check: (event: unknown) => event is T
): asserts event is T {
  if (!check(event)) {
    throw new Error(`Invalid event type: ${String(event)}`)
  }
}

/**
 * Event creation helpers with type inference
 */
export function createTableEvent<K extends keyof TableEventPayloads>(
  event: K,
  payload: TableEventPayloads[K]
) {
  return { event, payload }
}

export function createParameterEvent<K extends keyof ParameterEventPayloads>(
  event: K,
  payload: ParameterEventPayloads[K]
) {
  return { event, payload }
}

export function createScheduleEvent<K extends keyof ScheduleEventPayloads>(
  event: K,
  payload: ScheduleEventPayloads[K]
) {
  return { event, payload }
}
