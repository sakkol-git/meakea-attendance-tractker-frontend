import { useToast } from 'primevue/usetoast'
import { useQuery } from '@tanstack/vue-query'
import { DataFailure } from '../data/source'
export const useWorkspace = () => useNuxtApp().$workspace
export function useWorkspaceQuery<T>(key: string, fetcher: () => Promise<T>) {
  const session = useSessionStore()
  return useQuery({
    queryKey: computed(() => [
      'workspace',
      session.profile?.tenantId,
      session.profile?.employeeId,
      session.roles.join(','),
      key,
    ]),
    queryFn: fetcher,
    enabled: computed(() => !!session.profile),
  })
}
export function useFeedback() {
  const app = useNuxtApp()
  const toast = useToast()
  const busy = ref(false)
  const error = ref('')
  async function run<T>(task: () => Promise<T>, summary?: string): Promise<T | undefined> {
    if (busy.value) return
    error.value = ''
    busy.value = true
    try {
      const result = await task()
      if (summary) toast.add({ severity: 'success', summary, life: 4000 })
      await app.$queryClient.invalidateQueries({ queryKey: ['workspace'] })
      return result
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Something went wrong. Please try again.'
      toast.add({
        severity: 'error',
        summary:
          e instanceof DataFailure && e.status === 412
            ? 'This record has changed'
            : 'Unable to complete this action',
        detail: error.value,
        life: 8000,
      })
      return undefined
    } finally {
      busy.value = false
    }
  }
  return { busy, error, run }
}
