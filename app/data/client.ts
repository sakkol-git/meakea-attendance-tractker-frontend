import type { DataSource } from './source.ts'
import { LocalDataSource } from './local.ts'
import { RemoteDataSource } from './remote.ts'
import { DataFailure } from './source.ts'

/** Per-app instance. Tokens stay in memory and are never placed in Nuxt payload/state. */
export class ClientData {
  readonly source: DataSource
  private accessToken?: string
  constructor(
    mode: string = 'local',
    apiBaseUrl = '',
    csrf: () => string | undefined = () => undefined,
  ) {
    if (mode !== 'local' && mode !== 'remote')
      throw new DataFailure(0, 'INVALID_MODE', 'Data mode must be local or remote.')
    this.source =
      mode === 'local'
        ? new LocalDataSource()
        : new RemoteDataSource(apiBaseUrl, () => this.accessToken, globalThis.fetch, 15000, csrf)
  }
  setAccessToken(value: string | undefined) {
    this.accessToken = value
  }
  clearSession() {
    this.accessToken = undefined
  }
}
