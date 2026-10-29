<script setup lang="ts">
definePageMeta({ layout: false })
const session = useSessionStore()
const topics = [
  [
    'What is my workspace?',
    'Your workspace is the company name or code supplied by HR, such as example-company. Enter it separately from your work email. Ask HR if you are unsure.',
  ],
  [
    'Getting an account or a new password',
    'Ask your HR administrator to confirm your account and provide sign-in instructions. Workspace creation and email password recovery are not available in this workspace yet. Never share your password.',
  ],
  [
    'Your first workday',
    'Start on Overview to clock in or out. Open Leave to check balances and request dates. Open Requests to save a workplace request draft, review it and then send it for approval. Managers can review decisions in Approvals.',
  ],
  [
    'Location access',
    'Share location only when you are ready. If access was denied, enable location for HRFlow in your browser or device settings and try again. A location estimate does not confirm attendance; your company rules are checked when you submit.',
  ],
  [
    'An action was not confirmed',
    'Keep your entries and check the record or attendance history before trying again. An interrupted connection can leave the result unknown. If the status is still unclear, contact HR and include the support reference shown with the error.',
  ],
  [
    'Drafts and unsaved entries',
    'A saved workplace request draft is different from unsaved form entries. Follow the recovery message on the form. If recovery is unavailable, keep the form open until you save or finish it.',
  ],
]
</script>
<template>
  <main class="help-page">
    <header class="page-heading">
      <div>
        <h1>Help and getting started</h1>
        <p>Find your way around your workday and recover when you get stuck.</p>
      </div>
      <NuxtLink :to="session.profile ? '/' : '/login'" class="text-link">{{
        session.profile ? 'Back to workspace' : 'Back to sign in'
      }}</NuxtLink>
    </header>
    <section v-for="[title, description] in topics" :key="title" class="panel">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
    </section>
  </main>
</template>
