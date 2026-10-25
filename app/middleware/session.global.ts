const publicRoutes = ['/login', '/forgot-password', '/reset-password', '/setup']

export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSessionStore()
  await session.initialize()
  if (publicRoutes.includes(to.path)) return
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
