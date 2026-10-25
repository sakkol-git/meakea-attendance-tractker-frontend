const deploymentEnv = (
  globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
).process?.env
const signedFileOrigins = (deploymentEnv?.NUXT_PUBLIC_FILE_ORIGINS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter((value) => /^https:\/\/[^/]+$/i.test(value))
const apiOrigin = (() => {
  try {
    return new URL(deploymentEnv?.NUXT_PUBLIC_API_BASE_URL ?? '').origin
  } catch {
    return ''
  }
})()

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['@fontsource-variable/kantumruy-pro', 'primeicons/primeicons.css', '~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      dataSource: 'local',
      apiBaseUrl: '',
      csrfCookieName: 'XSRF-TOKEN',
      fileOrigins: '',
    },
  },
  app: {
    head: {
      title: 'HRFlow · Your people, connected',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'theme-color', content: '#006151' },
        {
          name: 'description',
          content: 'Your connected workspace for people, attendance and time off.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': `default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob:; connect-src 'self' ws: wss: ${[apiOrigin, ...signedFileOrigins].filter(Boolean).join(' ')}; frame-ancestors 'none'; base-uri 'self'; form-action 'self';`,
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
      },
    },
  },
})
