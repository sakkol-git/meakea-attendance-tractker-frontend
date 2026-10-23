import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
export default defineNuxtPlugin(() => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 300_000, retry: false, refetchOnWindowFocus: true },
      mutations: { retry: false },
    },
  })
  useNuxtApp().vueApp.use(VueQueryPlugin, { queryClient })
  return { provide: { queryClient } }
})
