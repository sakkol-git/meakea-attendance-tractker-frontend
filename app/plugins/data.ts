import { BusinessApi } from '../api/business'
import { authenticatedSource } from '../data/authenticated'
import { ClientData } from '../data/client'
import { DataFailure } from '../data/source'
import { LocalDataSource } from '../data/local'
import { WorkspaceDemoSource } from '../data/demo'
import { WorkspaceApi } from '../api/workspace'
import { SessionService } from '../api/auth'

export default defineNuxtPlugin({
  name: 'workspace-data',
  setup() {
    const config = useRuntimeConfig()
    const csrf = () => {
      const raw = document.cookie
        .split('; ')
        .find((x) => x.startsWith(`${config.public.csrfCookieName}=`))
        ?.split('=')
        .slice(1)
        .join('=')
      try {
        return raw ? decodeURIComponent(raw) : undefined
      } catch {
        return undefined
      }
    }
    const client = new ClientData(config.public.dataSource, config.public.apiBaseUrl, csrf)
    const demo =
      client.source instanceof LocalDataSource ? new WorkspaceDemoSource(client.source) : undefined
    const source = demo ?? client.source
    const guard = () => {
      if (!navigator.onLine)
        throw new DataFailure(0, 'OFFLINE', 'You are offline. No change was sent or queued.')
      if (source.mode === 'remote' && !csrf())
        throw new DataFailure(
          403,
          'CSRF_REQUIRED',
          'A secure session cookie is missing. Reload the sign-in page or contact your workspace administrator.',
        )
    }
    const sessionService = new SessionService(client, source, guard)
    const authenticated = authenticatedSource(
      source,
      () => sessionService.refresh(),
      () => {
        client.clearSession()
        window.dispatchEvent(new Event('hrflow:session-expired'))
      },
    )

    const workspace = new WorkspaceApi(
      authenticated,
      guard,
      demo ? () => demo.exportCsv() : undefined,
    )
    return {
      provide: {
        clientData: client,
        workspace,
        business: new BusinessApi(workspace, guard),
        sessionService,
        demoSource: demo,
      },
    }
  },
})
