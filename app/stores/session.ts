import { defineStore } from 'pinia'
import type { Role, UserProfile } from '../schemas/contracts'

export const useSessionStore = defineStore('session', () => {
  const app = useNuxtApp()
  const profile = ref<UserProfile>()
  const initialized = ref(false)
  const initializationError = ref('')
  let flight: Promise<void> | undefined
  const mode = computed(() => app.$workspace.mode)
  const roles = computed(() => profile.value?.roles ?? [])
  const isManager = computed(() =>
    roles.value.some((x) => ['MANAGER', 'HR_ADMIN', 'OWNER'].includes(x)),
  )
  const isAdmin = computed(() => roles.value.some((x) => ['HR_ADMIN', 'OWNER'].includes(x)))
  async function initialize() {
    if (initialized.value) return
    if (flight) return flight
    flight = (async () => {
      try {
        profile.value = await app.$sessionService.restore()
      } catch (e) {
        initializationError.value =
          e instanceof Error ? e.message : 'Your session could not be restored.'
      } finally {
        initialized.value = true
      }
    })()
    try {
      await flight
    } finally {
      flight = undefined
    }
  }
  async function signIn(body: Record<string, string>) {
    profile.value = await app.$sessionService.login(body)
    initialized.value = true
    initializationError.value = ''
    app.$queryClient.clear()
  }
  async function enterDemo(role: Role = 'EMPLOYEE') {
    if (!app.$demoSource) throw new Error('Demo mode is not enabled.')
    app.$demoSource.setRole(role)
    profile.value = await app.$sessionService.me()
    initialized.value = true
    initializationError.value = ''
    app.$queryClient.clear()
    app.$workspace.clear()
  }
  async function signOut() {
    let error: unknown
    try {
      await app.$sessionService.logout()
    } catch (e) {
      error = e
    } finally {
      profile.value = undefined
      initialized.value = true
      app.$queryClient.clear()
      app.$workspace.clear()
    }
    if (error) throw error
  }
  function expire() {
    app.$clientData.clearSession()
    profile.value = undefined
    app.$queryClient.clear()
    app.$workspace.clear()
    initialized.value = true
  }
  return {
    expire,
    profile,
    initialized,
    initializationError,
    mode,
    roles,
    isManager,
    isAdmin,
    initialize,
    signIn,
    enterDemo,
    signOut,
  }
})
