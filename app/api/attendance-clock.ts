import { commandKey, DataFailure } from '../data/source'
import type { DataResponse, RecordData } from '../data/source'

export interface ClockSession {
  id: string
  version: number
  etag?: string
}
export interface ClockLocation {
  latitude: number
  longitude: number
  accuracyMeters?: number
}

/** Retains one attendance tap's time, device, version and payload until its outcome is known. */
export class AttendanceClock {
  private clockAttempt?: { sessionId?: string; body: RecordData; etag?: string }
  constructor(
    private command: (path: string, body?: RecordData, etag?: string) => Promise<DataResponse>,
    private guard: () => void,
  ) {}
  async clock(open?: ClockSession, location?: ClockLocation) {
    this.guard()
    if (!this.clockAttempt || this.clockAttempt.sessionId !== open?.id) {
      let device: string | null = null
      try {
        device = localStorage.getItem('hrflow.installation-id')
      } catch {
        /* Storage may be disabled. The command still gets a session-local device reference. */
      }
      if (!device) {
        device = commandKey()
        try {
          localStorage.setItem('hrflow.installation-id', device)
        } catch {
          /* No credentials or command receipts are persisted. */
        }
      }
      this.clockAttempt = {
        sessionId: open?.id,
        body: {
          deviceId: device,
          occurredAt: new Date().toISOString(),
          ...(location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                accuracyMeters: location.accuracyMeters,
              }
            : {}),
          ...(open ? { sessionId: open.id } : { source: 'TAP' }),
        },
        etag: open ? (open.etag ?? `"${open.version}"`) : undefined,
      }
    }
    const attempt = this.clockAttempt
    try {
      const result = await this.command(
        open ? '/attendance/check-out' : '/attendance/check-in',
        attempt.body,
        attempt.etag,
      )
      this.clockAttempt = undefined
      return result
    } catch (e) {
      if (e instanceof DataFailure && e.status >= 400 && e.status < 500)
        this.clockAttempt = undefined
      throw e
    }
  }
  clear() {
    this.clockAttempt = undefined
  }
}
