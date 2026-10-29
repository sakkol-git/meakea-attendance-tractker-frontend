<script setup lang="ts">
import { initials } from '~/utils/format'
import type { Role } from '~/types/workspace'
import { workspaceNavigation, workspaceGroups } from '~/features/navigation'
const session = useSessionStore()
const route = useRoute()
const api = useWorkspace()
const notices = useWorkspaceQuery('notifications', () => api.notices())
const unread = computed(() => notices.data.value?.items.filter((x) => !x.read).length ?? 0)
const drawer = ref(false)
const offline = ref(false)
const quickSearch = ref('')
const roleOptions = [
  { label: 'Employee', value: 'EMPLOYEE' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'HR administrator', value: 'HR_ADMIN' },
  { label: 'Owner', value: 'OWNER' },
]
const navigation = computed(() => workspaceNavigation(session.roles))
const groups = computed(() => workspaceGroups(session.roles))
const searchResults = computed(() =>
  quickSearch.value
    ? navigation.value.filter((x) =>
        x.label.toLowerCase().includes(quickSearch.value.toLowerCase()),
      )
    : [],
)
const activeTitle = computed(
  () =>
    navigation.value.find((x) => (x.to === '/' ? route.path === '/' : route.path.startsWith(x.to)))
      ?.label || (route.path === '/profile' ? 'My profile' : 'Settings'),
)
watch(
  () => route.path,
  () => {
    drawer.value = false
    quickSearch.value = ''
  },
)
async function changeRole(value: Role) {
  await session.enterDemo(value)
  if (!navigation.value.some((x) => x.to === route.path)) await navigateTo('/')
}
async function logout() {
  try {
    await session.signOut()
    await navigateTo('/login')
  } catch {
    await navigateTo('/login?logout=unconfirmed')
  }
}
function connectivity() {
  offline.value = !navigator.onLine
}
onMounted(() => {
  connectivity()
  window.addEventListener('online', connectivity)
  window.addEventListener('offline', connectivity)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', connectivity)
  window.removeEventListener('offline', connectivity)
})
</script>
<template>
  <div class="workspace-shell">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <PDialog
      v-model:visible="drawer"
      modal
      header="Workspace navigation"
      class="nav-dialog dialog-sm"
      dismissable-mask
      ><nav aria-label="Mobile navigation">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          @click="drawer = false"
          ><AppIcon :name="item.icon" />{{ item.label }}</NuxtLink
        ><NuxtLink to="/settings" class="nav-item">Settings</NuxtLink
        ><NuxtLink to="/profile" class="nav-item">My profile</NuxtLink>
      </nav></PDialog
    >
    <aside class="sidebar">
      <NuxtLink class="brand" to="/" aria-label="HRFlow home"
        ><span class="brand-mark">h<span>f</span></span
        ><span>HRFlow<span class="brand-dot">.</span></span></NuxtLink
      >
      <div class="workspace-name">
        <span class="company-mark"><AppIcon name="building" /></span>
        <div>
          <strong>{{ session.mode === 'local' ? 'HRFlow Studio' : 'My workspace' }}</strong
          ><small>{{ session.mode === 'local' ? 'Demo company' : 'People workspace' }}</small>
        </div>
        <AppIcon name="chevron-down" />
      </div>
      <nav aria-label="Main navigation">
        <template v-for="group in groups" :key="group.label">
          <p class="nav-caption">{{ group.label }}</p>
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            :class="{
              active: item.to === '/' ? route.path === '/' : route.path.startsWith(item.to),
            }"
            :aria-current="
              (item.to === '/' ? route.path === '/' : route.path.startsWith(item.to))
                ? 'page'
                : undefined
            "
            ><AppIcon :name="item.icon" /><span>{{ item.label }}</span></NuxtLink
          >
        </template>
      </nav>
      <div class="sidebar-bottom">
        <NuxtLink to="/settings" class="nav-item"><AppIcon name="cog" />Settings</NuxtLink
        ><button class="nav-item" @click="logout"><AppIcon name="sign-out" />Sign out</button>
      </div>
    </aside>
    <div class="workspace-main">
      <header class="topbar">
        <div class="breadcrumb">
          <PButton
            class="mobile-menu"
            icon="pi pi-bars"
            aria-label="Open navigation"
            text
            @click="drawer = true"
          /><span class="breadcrumb-company">Workspace</span
          ><AppIcon name="angle-right" /><strong>{{ activeTitle }}</strong>
        </div>
        <div class="topbar-actions">
          <div class="quick-search">
            <AppIcon name="search" /><input
              v-model="quickSearch"
              aria-label="Find a page"
              placeholder="Find a page…"
              autocomplete="off"
            /><kbd>/</kbd>
            <div v-if="quickSearch" class="search-results">
              <NuxtLink v-for="result in searchResults" :key="result.to" :to="result.to"
                >{{ result.label }}<AppIcon name="arrow-up-right"
              /></NuxtLink>
              <p v-if="!searchResults.length">No matching pages.</p>
            </div>
          </div>
          <NuxtLink
            to="/notifications"
            class="notification-link"
            :aria-label="
              unread
                ? `Open notifications, ${unread} unread in the current page`
                : 'Open notifications'
            "
            ><AppIcon name="bell" /><span v-if="unread" class="notification-dot" /></NuxtLink
          ><span class="topbar-divider" /><NuxtLink to="/profile" class="account-link"
            ><span class="avatar">{{ initials(session.profile?.name || 'User') }}</span
            ><span class="account-name"
              >{{ session.profile?.name
              }}<small>{{
                roleOptions.find((x) => session.roles.includes(x.value as Role))?.label
              }}</small></span
            ><AppIcon name="chevron-down"
          /></NuxtLink>
        </div>
      </header>
      <div v-if="session.mode === 'local'" class="demo-strip">
        <span
          ><AppIcon name="flask" /><strong>Demo workspace</strong
          ><span class="demo-description">Synthetic data · changes reset on refresh</span></span
        ><label class="role-switch"
          >View as<PSelect
            :model-value="session.roles[0]"
            :options="roleOptions"
            option-label="label"
            option-value="value"
            aria-label="Demo role"
            @update:model-value="changeRole"
        /></label>
      </div>
      <div v-if="offline" class="offline-strip" role="status">
        <AppIcon name="wifi" />You’re offline. New changes are paused; no action is queued or
        confirmed.
      </div>
      <main id="main-content" class="page-content" tabindex="-1"><slot /></main>
      <footer class="app-footer">
        <span>HRFlow · A better way to work together.</span
        ><span
          >{{
            session.mode === 'local'
              ? 'Sample workspace'
              : offline
                ? 'Offline · changes paused'
                : 'Check notifications for updates'
          }}<i class="connection-dot" :class="{ 'is-live': !offline }"
        /></span>
      </footer>
    </div>
  </div>
</template>
