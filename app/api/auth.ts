import { z } from 'zod'
import type { ClientData } from '../data/client.ts'
import type { DataSource, RecordData } from '../data/source.ts'
import { commandKey } from '../data/source.ts'
import { decode, Profile } from '../schemas/contracts.ts'

/** Tokens exist only inside ClientData's private closure; no persisted store or SSR payload. */
export class SessionService {
  private client: ClientData
  private source: DataSource
  private guard: () => void
  private epoch = 0
  private refreshFlight?: Promise<void>
  constructor(client: ClientData, source: DataSource, guard: () => void = () => {}) {
    this.client = client
    this.source = source
    this.guard = guard
  }
  async me() {
    return decode(Profile, (await this.source.send({ method: 'GET', path: '/auth/me' })).data)
  }
  async login(body: RecordData) {
    this.guard()
    const epoch = ++this.epoch
    const r = await this.source.send({
      method: 'POST',
      path: '/auth/login',
      body,
      idempotencyKey: commandKey(),
    })
    const tokens = decode(z.object({ accessToken: z.string().min(1) }), r.data)
    if (epoch !== this.epoch) throw new Error('This sign-in was cancelled.')
    this.client.setAccessToken(tokens.accessToken)
    try {
      return await this.me()
    } catch (e) {
      this.client.clearSession()
      throw e
    }
  }
  async refresh() {
    if (this.refreshFlight) return this.refreshFlight
    const epoch = this.epoch
    this.refreshFlight = (async () => {
      this.guard()
      const r = await this.source.send({
        method: 'POST',
        path: '/auth/refresh',
        idempotencyKey: commandKey(),
      })
      const result = decode(z.object({ accessToken: z.string().min(1) }), r.data)
      if (epoch !== this.epoch) throw new Error('This session has ended.')
      this.client.setAccessToken(result.accessToken)
    })()
    try {
      await this.refreshFlight
    } finally {
      this.refreshFlight = undefined
    }
  }
  async restore() {
    try {
      return await this.me()
    } catch (e) {
      if (!(e && typeof e === 'object' && 'status' in e && e.status === 401)) throw e
      await this.refresh()
      return this.me()
    }
  }
  async logout() {
    this.epoch++
    try {
      if (this.source.mode === 'remote') {
        this.guard()
        await this.source.send({
          method: 'POST',
          path: '/auth/logout',
          idempotencyKey: commandKey(),
        })
      }
    } finally {
      this.client.clearSession()
    }
  }
}
