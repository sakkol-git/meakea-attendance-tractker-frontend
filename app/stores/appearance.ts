import { defineStore } from 'pinia'
import { darkAppearance, type Appearance } from '../utils/appearance'

export const useAppearanceStore = defineStore('appearance', {
  state: () => ({ preference: 'system' as Appearance, systemDark: false }),
  getters: {
    dark: (state) => darkAppearance(state.preference, state.systemDark),
  },
})
