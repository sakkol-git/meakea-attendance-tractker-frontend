<script setup lang="ts">
import { notificationRoute } from '~/utils/notification-route'
import { dateLabel } from '~/utils/format'
const api = useWorkspace()
const feedback = useFeedback()
const onlyUnread = ref(false)
const result = useWorkspaceQuery('notifications', () => api.notices())
const rows = computed(
  () => result.data.value?.items.filter((x) => !onlyUnread.value || !x.read) || [],
)
async function mark(id?: string) {
  await feedback.run(() => api.readNotice(id), id ? undefined : 'All updates marked read')
}
</script>
<template>
  <PageHeading
    title="Your updates"
    description="The things that matter, all in one place."
    eyebrow="STAY IN THE LOOP"
  >
    <div class="heading-actions">
      <NuxtLink to="/settings">
        <PButton label="Preferences" icon="pi pi-cog" outlined />
      </NuxtLink>
      <PButton
        label="Mark all read"
        icon="pi pi-check"
        outlined
        :loading="feedback.busy.value"
        :disabled="!result.data.value?.items.some((x) => !x.read)"
        @click="mark()"
      />
    </div>
  </PageHeading>
  <section class="panel">
    <div class="section-heading">
      <h2>Workspace notifications</h2>
      <label class="toggle-label"
        ><PToggleSwitch v-model="onlyUnread" input-id="unread" /><span>Unread only</span></label
      >
    </div>
    <QueryState
      :pending="result.isPending.value"
      :error="result.error.value"
      :empty="!rows.length"
      :title="onlyUnread ? 'No unread updates' : 'You’re all caught up'"
      :message="
        onlyUnread
          ? 'You can still review updates you have already read.'
          : 'New updates will appear here.'
      "
      @retry="result.refetch()"
      ><article v-for="row in rows" :key="row.id" class="notice-row" :class="{ unread: !row.read }">
        <span class="record-icon leave"><AppIcon name="bell" /></span>
        <div>
          <h3>{{ row.title }} <span v-if="!row.read" class="count-badge">New</span></h3>
          <p>{{ row.detail }}</p>
          <small>{{ dateLabel(row.createdAt, 'MMM d, h:mm a') }}</small>
          <p v-if="!notificationRoute(row)" class="small-note">
            No linked record is available for this update.
          </p>
          <div class="inline-actions">
            <NuxtLink
              v-if="notificationRoute(row)"
              :to="notificationRoute(row)!"
              class="text-link"
              @click="mark(row.id)"
              >View update<AppIcon name="arrow-right" /></NuxtLink
            ><PButton
              v-if="!row.read"
              label="Mark read"
              text
              size="small"
              :disabled="feedback.busy.value"
              @click="mark(row.id)"
            />
          </div>
        </div>
      </article>
      <template #empty
        ><PButton v-if="onlyUnread" label="Show all updates" outlined @click="onlyUnread = false"
      /></template>
    </QueryState>
  </section>
</template>
