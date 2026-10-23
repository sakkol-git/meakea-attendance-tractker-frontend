export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore()
  await session.initialize()
  if (to.path === '/login') return
  if (!session.profile)
    return navigateTo({
      path: '/login',
      query: {
        returnTo: to.fullPath.startsWith('/') && !to.fullPath.startsWith('//') ? to.fullPath : '/',
      },
    })
  const required = to.meta.roles as string[] | undefined
  if (required && !session.roles.some((role) => required.includes(role)))
    return navigateTo('/forbidden')
})
