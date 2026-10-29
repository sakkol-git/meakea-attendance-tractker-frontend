import {
  canReviewRequests as reviewRequests,
  canFulfillRequests as fulfillRequests,
} from '../features/requests/permissions'
import { defineStore } from 'pinia'
import { useListViewsStore } from './list-views'
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
  const canReviewRequests = computed(() => reviewRequests(mode.value, roles.value))
  const canFulfillRequests = computed(() => fulfillRequests(mode.value, roles.value))
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
    useListViewsStore().$reset()
    initialized.value = true
    initializationError.value = ''
    app.$queryClient.clear()
  }
  async function enterDemo(role: Role = 'EMPLOYEE') {
    if (!app.$demoSource) throw new Error('Demo mode is not enabled.')
    app.$demoSource.setRole(role)
    profile.value = await app.$sessionService.me()
    useListViewsStore().$reset()
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
      useListViewsStore().$reset()
      initialized.value = true
      app.$queryClient.clear()
      app.$workspace.clear()
      app.$business.clear()
    }
    if (error) throw error
  }
  function expire() {
    useListViewsStore().$reset()
    app.$clientData.clearSession()
    profile.value = undefined
    app.$queryClient.clear()
    app.$workspace.clear()
    app.$business.clear()
    initialized.value = true
  }
  async function forgotPassword(email: string) {
    return app.$sessionService.forgotPassword(email)
  }
  async function resetPassword(body: { token: string; newPassword: string }) {
    return app.$sessionService.resetPassword(body)
  }
  async function changePassword(body: { currentPassword: string; newPassword: string }) {
    return app.$sessionService.changePassword(body)
  }
  async function updateProfile(body: { name?: string; timeZone?: string }) {
    const updated = await app.$sessionService.updateProfile(body)
    profile.value = updated
    return updated
  }
  async function setupWorkspace(body: {
    name: string
    slug: string
    ownerName: string
    ownerEmail: string
    bootstrapCode?: string
    timezone?: string
    locale?: string
  }) {
    return app.$sessionService.setupWorkspace(body)
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
    canReviewRequests,
    canFulfillRequests,
    initialize,
    signIn,
    enterDemo,
    signOut,
    setupWorkspace,
    forgotPassword,
    resetPassword,
    changePassword,
    updateProfile,
  }
})
