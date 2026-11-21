<script setup lang="ts">
const props = defineProps<{ pages: { label: string; to: string; icon: string }[] }>()
const route = useRoute()
const visible = ref(false)
const query = ref('')
const matches = computed(() =>
  [
    ...props.pages,
    { label: 'Settings', to: '/settings', icon: 'cog' },
    { label: 'My profile', to: '/profile', icon: 'user' },
    { label: 'Notifications', to: '/notifications', icon: 'bell' },
  ].filter((page) =>
    page.label.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase()),
  ),
)
async function firstMatch() {
  const first = matches.value[0]
  if (!first) return
  visible.value = false
  await navigateTo(first.to)
}
function shortcut(event: KeyboardEvent) {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.repeat ||
    event.altKey ||
    event.shiftKey ||
    !(event.ctrlKey || event.metaKey) ||
    event.key.toLowerCase() !== 'k'
  )
    return
  if (!visible.value && document.querySelector('[aria-modal="true"]')) return
  event.preventDefault()
  visible.value = !visible.value
}
watch(
  () => route.fullPath,
  () => {
    visible.value = false
  },
)
watch(visible, (open) => {
  if (!open) query.value = ''
})
onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut))
</script>
<template>
  <PButton
    text
    icon="pi pi-search"
    aria-label="Find a page"
    title="Find a page (Ctrl or ⌘ + K)"
    aria-keyshortcuts="Control+k Meta+k"
    aria-haspopup="dialog"
    @click="visible = true"
  />
  <PDialog v-model:visible="visible" modal header="Find a page" class="dialog-sm" dismissable-mask>
    <div class="page-search">
      <label for="page-query">Search pages</label>
      <input
        id="page-query"
        v-model="query"
        type="search"
        autocomplete="off"
        autofocus
        @keydown.enter.prevent="firstMatch"
      />
      <p v-if="!matches.length" role="status">No matching pages. Try another name.</p>
      <nav v-else aria-label="Matching pages">
        <NuxtLink
          prefetch-on="interaction"
          v-for="item in matches"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          @click="visible = false"
          ><AppIcon :name="item.icon" />{{ item.label }}</NuxtLink
        >
      </nav>
    </div>
  </PDialog>
</template>
<style scoped>
.page-search {
  display: grid;
  gap: var(--space-2);
}
.page-search input {
  min-height: var(--control-height);
  padding-inline: var(--space-3);
  border: thin solid var(--border-strong);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  background: var(--surface);
}
.page-search nav {
  display: grid;
}
.page-search .nav-item {
  min-height: var(--control-height);
  color: var(--text-primary);
}
</style>
