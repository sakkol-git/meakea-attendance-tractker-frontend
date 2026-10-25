import type { NoticeRow } from '~/schemas/contracts'

export function useRealtimeNotifications() {
  const nuxtApp = useNuxtApp()
  const session = useSessionStore()
  const config = useRuntimeConfig()

  const connected = ref(false)
  const lastEvent = ref<NoticeRow | null>(null)
  const streamEvents = ref<NoticeRow[]>([])

  let eventSource: EventSource | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let retryCount = 0

  function connect() {
    if (import.meta.server) return

    if (session.mode === 'local') {
      connected.value = true
      return
    }

    if (eventSource) return

    const baseUrl = config.public.apiBaseUrl || ''
    const streamUrl = `${baseUrl}/notifications/stream`

    try {
      eventSource = new EventSource(streamUrl, { withCredentials: true })

      eventSource.onopen = () => {
        connected.value = true
        retryCount = 0
      }

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as NoticeRow
          lastEvent.value = data
          streamEvents.value.unshift(data)
          if (streamEvents.value.length > 20) {
            streamEvents.value.pop()
          }

          // Trigger TanStack query cache invalidation on incoming workspace notifications
          nuxtApp.$queryClient.invalidateQueries({ queryKey: ['workspace'] })
        } catch {
          // Ignore ping / keepalive frame parse issues
        }
      }

      eventSource.onerror = () => {
        connected.value = false
        disconnect()
        // Exponential backoff: 2s, 4s, 8s, capped at 30s
        const delay = Math.min(30000, 2000 * Math.pow(2, retryCount++))
        reconnectTimeout = setTimeout(connect, delay)
      }
    } catch {
      connected.value = false
    }
  }

  function disconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (eventSource) {
      eventSource.close()
      eventSource = null
    }
    connected.value = false
  }

  return {
    connected,
    lastEvent,
    streamEvents,
    connect,
    disconnect,
  }
}
