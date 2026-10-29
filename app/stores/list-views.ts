import { defineStore } from 'pinia'

type ListView = { query: string; status: string; page: number; first: number }

/** Short-lived navigation preferences; cleared whenever the account changes. */
export const useListViewsStore = defineStore('list-views', {
  state: () => ({ views: {} as Record<string, ListView> }),
  actions: {
    forList(key: string): ListView {
      return (this.views[key] ??= { query: '', status: 'All statuses', page: 0, first: 0 })
    },
  },
})
