import { appearancePreference } from '~/utils/appearance'

export default defineNuxtPlugin(() => {
  const appearance = useAppearanceStore()
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  try {
    appearance.preference = appearancePreference(localStorage.getItem('hrflow.appearance'))
  } catch {
    /* Browser storage is optional; appearance still works for this visit. */
  }
  appearance.systemDark = media.matches
  const update = (event: MediaQueryListEvent) => {
    appearance.systemDark = event.matches
  }
  media.addEventListener('change', update)
  watch(
    () => appearance.dark,
    (dark) => {
      document.documentElement.classList.toggle('hrflow-dark', dark)
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
    },
    { immediate: true },
  )
  watch(
    () => appearance.preference,
    (value) => {
      try {
        localStorage.setItem('hrflow.appearance', value)
      } catch {
        /* Private-browser storage may be unavailable. */
      }
    },
  )
  if (import.meta.hot) import.meta.hot.dispose(() => media.removeEventListener('change', update))
})
