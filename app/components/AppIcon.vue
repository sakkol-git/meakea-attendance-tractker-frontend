<script setup lang="ts">
defineProps<{ name: string }>()
</script>
<template><i :class="`pi pi-${name}`" aria-hidden="true" /></template>
