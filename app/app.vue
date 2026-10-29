<script setup lang="ts">
const session = useSessionStore()
function expired() {
  session.expire()
  navigateTo('/login')
}
onMounted(() => window.addEventListener('hrflow:session-expired', expired))
onBeforeUnmount(() => window.removeEventListener('hrflow:session-expired', expired))
</script>
<template>
  <NuxtRouteAnnouncer /><NuxtLoadingIndicator color="#006151" /><NuxtLayout><NuxtPage /></NuxtLayout
  ><PToast group="action-success" position="bottom-right" /><PToast
    position="top-right"
  /><PConfirmDialog />
</template>
