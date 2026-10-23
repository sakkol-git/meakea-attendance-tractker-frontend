import { DataFailure } from './source'
import type { DataRequest, DataSource } from './source'

/** Retry exactly once after refresh. A service outage is not evidence of session revocation. */
export function authenticatedSource(
  source: DataSource,
  refresh: () => Promise<void>,
  expire: () => void,
): DataSource {
  const expired = (error: unknown) =>
    error instanceof DataFailure && [401, 403].includes(error.status)
  return {
    mode: source.mode,
    async send(request: DataRequest) {
      try {
        return await source.send(request)
      } catch (error) {
        if (
          source.mode !== 'remote' ||
          !(error instanceof DataFailure) ||
          error.status !== 401 ||
          request.path.startsWith('/auth/')
        )
          throw error
        try {
          await refresh()
        } catch (refreshError) {
          if (expired(refreshError)) expire()
          throw refreshError
        }
        try {
          return await source.send(request)
        } catch (retryError) {
          if (retryError instanceof DataFailure && retryError.status === 401) expire()
          throw retryError
        }
      }
    },
  }
}
