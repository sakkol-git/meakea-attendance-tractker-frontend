<script setup lang="ts">
import { initials, titleCase } from '~/utils/format'
const session = useSessionStore()
</script>
<template>
  <PageHeading
    title="My profile"
    description="Your place in the bigger picture."
    eyebrow="A LITTLE ABOUT YOU"
  />
  <section class="panel profile-panel">
    <span class="avatar large">{{ initials(session.profile?.name || '') }}</span>
    <div>
      <h2>{{ session.profile?.name }}</h2>
      <p>{{ session.profile?.position || 'Position not provided' }}</p>
      <StatusBadge status="ACTIVE" />
    </div>
    <dl class="detail-list">
      <div>
        <dt>Work email</dt>
        <dd>{{ session.profile?.email || 'Not provided' }}</dd>
      </div>
      <div>
        <dt>Department</dt>
        <dd>{{ session.profile?.department || 'Not provided' }}</dd>
      </div>
      <div>
        <dt>Roles</dt>
        <dd>{{ session.roles.map(titleCase).join(', ') }}</dd>
      </div>
      <div>
        <dt>Time zone</dt>
        <dd>{{ session.profile?.timeZone }}</dd>
      </div>
      <div>
        <dt>Employee reference</dt>
        <dd>{{ session.profile?.employeeId }}</dd>
      </div>
    </dl>
    <div class="gentle-note">
      <AppIcon name="info-circle" />
      <p>
        Need to update your details, password, or access? Contact your workspace administrator.
        Self-service account changes need the identity service to support them.
      </p>
    </div>
  </section>
</template>
