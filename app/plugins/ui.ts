import Column from 'primevue/column'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'
import { defineAsyncComponent } from 'vue'
import type { Component } from 'vue'

const theme = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eff9f5',
      100: '#d9eee5',
      200: '#b5ddce',
      300: '#87c5af',
      400: '#48a88a',
      500: '#087963',
      600: '#006151',
      700: '#005447',
      800: '#00463b',
      900: '#063e35',
      950: '#03261f',
    },
  },
})
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(PrimeVue, {
    theme: { preset: theme, options: { darkModeSelector: '.hrflow-dark' } },
    ripple: false,
  })
  nuxtApp.vueApp.use(ToastService)
  nuxtApp.vueApp.use(ConfirmationService)
  // PrimeVue inspects Column vnode types synchronously; keep columns eager.
  nuxtApp.vueApp.component('PColumn', Column)
  // Load widgets on demand rather than shipping every table/dialog with the login route.
  const components = {
    Button: () => import('primevue/button'),
    InputText: () => import('primevue/inputtext'),
    Textarea: () => import('primevue/textarea'),
    Select: () => import('primevue/select'),
    Dialog: () => import('primevue/dialog'),
    Tag: () => import('primevue/tag'),
    DataTable: () => import('primevue/datatable'),
    Toast: () => import('primevue/toast'),
    ConfirmDialog: () => import('primevue/confirmdialog'),
    Skeleton: () => import('primevue/skeleton'),
    ToggleSwitch: () => import('primevue/toggleswitch'),
  }
  for (const [name, loader] of Object.entries(components))
    nuxtApp.vueApp.component(`P${name}`, defineAsyncComponent<Component>(loader))
})
