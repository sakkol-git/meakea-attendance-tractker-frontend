<template>
  <section class="empty-state panel">
    <span class="state-icon"><AppIcon name="lock" /></span>
    <h1>This page needs another role</h1>
    <p>
      Your current role doesn’t have access. Contact your workspace administrator if you need
      permission.
    </p>
    <NuxtLink to="/" class="text-link"
      >Back to your overview<AppIcon name="arrow-right"
    /></NuxtLink>
  </section>
</template>
