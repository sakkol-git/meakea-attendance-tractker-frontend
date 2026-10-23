export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@pinia/nuxt'],
  css: ['@fontsource-variable/kantumruy-pro', 'primeicons/primeicons.css', '~/assets/css/main.css'],
  runtimeConfig: {
    public: { dataSource: 'local', apiBaseUrl: '', csrfCookieName: 'XSRF-TOKEN' },
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
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'X-Frame-Options': 'DENY',
      },
    },
  },
})
