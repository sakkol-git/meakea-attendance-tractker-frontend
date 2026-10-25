import { DataFailure } from '../data/source'

/** User-facing failure text. A server trace ID is safe to share with support. */
export function failureMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.'
  return error instanceof DataFailure && error.traceId
    ? `${message} Reference: ${error.traceId}.`
    : message
}
