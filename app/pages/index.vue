<script setup lang="ts">
import { dateLabel, clockLabel, duration } from '~/utils/format'
const session = useSessionStore()
const api = useWorkspace()
const feedback = useFeedback()
const today = useWorkspaceQuery('today', () => api.today())
const balance = useWorkspaceQuery('balances', () => api.balances())
const leave = useWorkspaceQuery('leave', () => api.list('myLeaves'))
const notices = useWorkspaceQuery('notifications', () => api.notices())
const holidays = useWorkspaceQuery('holidays', () => api.list('holidays'))
const showLeave = ref(false)
const showRequest = ref(false)
const open = computed(() => today.data.value?.sessions.find((x) => !x.clockOut))
const latest = computed(() => today.data.value?.sessions.at(-1))
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => {
  timer = setInterval(() => (now.value = new Date()), 1000)
})
onBeforeUnmount(() => clearInterval(timer))
import type { GeolocationCoordinates } from '~/utils/geofence'

const currentLocation = ref<GeolocationCoordinates>()

async function clock() {
  await feedback.run(
    () => api.clock(open.value, currentLocation.value),
    open.value ? 'Clock-out recorded' : 'Clock-in recorded',
  )
}
const pendingLeave = useWorkspaceQuery('pending-leave-home', () =>
  session.isManager ? api.list('pendingLeaves') : Promise.resolve({ items: [], total: 0 }),
)
const pendingRequests = useWorkspaceQuery('pending-requests-home', () =>
  session.isManager ? api.list('pendingRequests') : Promise.resolve({ items: [], total: 0 }),
)
const pendingCorrections = useWorkspaceQuery('pending-corrections-home', () =>
  session.isManager ? api.list('corrections') : Promise.resolve({ items: [], total: 0 }),
)
const totalPendingApprovals = computed(() => {
  if (!session.isManager) return 0
  const lCount = pendingLeave.data.value?.total ?? 0
  const rCount = pendingRequests.data.value?.total ?? 0
  const cCount =
    pendingCorrections.data.value?.items.filter((x) => x.status === 'PENDING').length ?? 0
  return lCount + rCount + cCount
})
</script>
<template>
  <PageHeading
    :title="`Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${session.profile?.name.split(' ')[0] || 'there'} 👋`"
    description="A clear view of your workday. A little more room for what matters."
    :eyebrow="dateLabel(now.toISOString(), 'EEEE, MMMM d, yyyy')"
    ><PButton label="Request time off" icon="pi pi-plus" outlined @click="showLeave = true"
  /></PageHeading>
  <section
    v-if="session.isManager && totalPendingApprovals > 0"
    class="panel manager-review-banner"
  >
    <div class="manager-review-content">
      <span class="record-icon peach"><AppIcon name="check-square" /></span>
      <div>
        <h3>
          {{ totalPendingApprovals }} team
          {{ totalPendingApprovals === 1 ? 'item requires' : 'items require' }} your decision
        </h3>
        <p>
          {{ pendingLeave.data.value?.total ?? 0 }} time off ·
          {{ pendingRequests.data.value?.total ?? 0 }} requests ·
          {{
            pendingCorrections.data.value?.items.filter((x) => x.status === 'PENDING').length ?? 0
          }}
          attendance issues
        </p>
      </div>
    </div>
    <NuxtLink to="/approvals">
      <PButton label="Review approvals" icon="pi pi-arrow-right" icon-pos="right" size="small" />
    </NuxtLink>
  </section>
  <div class="overview-grid">
    <section class="attendance-hero">
      <div class="hero-copy">
        <span class="hero-eyebrow"><i class="live-dot" /> YOUR WORKDAY</span>
        <h2>
          {{
            open
              ? 'You’re right on time.'
              : latest
                ? 'A good day, well spent.'
                : 'Ready when you are.'
          }}
        </h2>
        <p>
          {{
            open
              ? 'You’re clocked in. Here’s to a focused, balanced day.'
              : latest
                ? 'Your clock-out is recorded. See you next time.'
                : 'Settle in, take a breath, and start your workday.'
          }}
        </p>
        <AttendanceGeoCard @update:location="(loc) => (currentLocation = loc)" />
        <div class="clock-action">
          <PButton
            :label="open ? 'Clock out' : 'Clock in'"
            :icon="open ? 'pi pi-sign-out' : 'pi pi-sign-in'"
            :loading="feedback.busy.value"
            :disabled="today.isPending.value || !!today.error.value"
            @click="clock"
          /><NuxtLink to="/attendance">View attendance<AppIcon name="arrow-right" /></NuxtLink>
        </div>
        <p v-if="feedback.error.value" class="hero-error" role="alert">
          {{ feedback.error.value }}
        </p>
      </div>
      <div class="hero-clock">
        <span class="clock-halo"><AppIcon name="clock" /></span
        ><strong>{{ clockLabel(now.toISOString(), session.profile?.timeZone) }}</strong
        ><span>{{ session.profile?.timeZone?.replaceAll('_', ' ') }}</span
        ><span class="hero-status">{{
          open ? 'Clocked in' : latest ? 'Completed' : 'Not recorded'
        }}</span>
      </div>
      <div class="hero-bottom">
        <span
          ><AppIcon name="sign-in" /> Clock in
          <strong>{{ clockLabel(latest?.clockIn, session.profile?.timeZone) }}</strong></span
        ><span
          ><AppIcon name="sign-out" /> Clock out
          <strong>{{ clockLabel(latest?.clockOut, session.profile?.timeZone) }}</strong></span
        ><span
          ><AppIcon name="hourglass" /> Total
          <strong>{{ latest ? duration(latest.clockIn, latest.clockOut) : '—' }}</strong></span
        >
      </div>
    </section>
    <section class="panel leave-summary">
      <div class="section-heading">
        <h2>A little time for you</h2>
        <span class="record-icon leave"><AppIcon name="sun" /></span>
      </div>
      <QueryState
        :pending="balance.isPending.value"
        :error="balance.error.value"
        @retry="balance.refetch()"
        ><div class="balance-number">
          {{ balance.data.value?.items.find((x) => x.type === 'Annual leave')?.available ?? '—'
          }}<span>days available</span>
        </div>
        <p>Annual leave · {{ new Date().getFullYear() }}</p>
        <div class="balance-track"><span /></div>
        <span class="small-note"
          >{{ balance.data.value?.items.find((x) => x.type === 'Annual leave')?.pending ?? 0 }} days
          pending approval</span
        ><NuxtLink to="/leave" class="text-link"
          >Plan your next break<AppIcon name="arrow-up-right" /></NuxtLink
      ></QueryState>
    </section>
  </div>
  <div class="quick-actions-grid">
    <NuxtLink to="/attendance" class="quick-action"
      ><span class="record-icon blue"><AppIcon name="calendar" /></span>
      <div><strong>Attendance history</strong><small>Your workdays, at a glance</small></div>
      <AppIcon name="arrow-up-right" /></NuxtLink
    ><button class="quick-action" @click="showRequest = true">
      <span class="record-icon violet"><AppIcon name="briefcase" /></span>
      <div><strong>Make a request</strong><small>A little help for your workspace</small></div>
      <AppIcon name="arrow-up-right" /></button
    ><NuxtLink :to="session.isManager ? '/approvals' : '/profile'" class="quick-action"
      ><span class="record-icon peach"
        ><AppIcon :name="session.isManager ? 'check-square' : 'user'"
      /></span>
      <div>
        <strong>{{ session.isManager ? 'Review approvals' : 'My profile' }}</strong
        ><small>{{
          session.isManager ? 'Keep your team moving' : 'Your details, in one place'
        }}</small>
      </div>
      <AppIcon name="arrow-up-right"
    /></NuxtLink>
  </div>
  <div class="home-lower-grid">
    <section class="panel no-padding">
      <div class="section-heading padded">
        <div>
          <h2>Your time off</h2>
          <p>Your latest plans and requests</p>
        </div>
        <NuxtLink to="/leave" class="text-link">View all<AppIcon name="arrow-right" /></NuxtLink>
      </div>
      <QueryState
        :pending="leave.isPending.value"
        :error="leave.error.value"
        :empty="!leave.data.value?.items.length"
        title="Make room for a break"
        message="Your time-off requests will appear here."
        @retry="leave.refetch()"
        ><RequestTable :rows="leave.data.value?.items.slice(0, 4) || []" kind="leave" compact
      /></QueryState>
    </section>
    <section class="panel">
      <div class="section-heading">
        <h2>Coming up</h2>
        <span class="subtle"><AppIcon name="calendar" /></span>
      </div>
      <QueryState
        :pending="holidays.isPending.value"
        :error="holidays.error.value"
        :empty="!holidays.data.value?.items.length"
        title="A clear calendar"
        message="No upcoming company dates."
        @retry="holidays.refetch()"
        ><div
          v-for="holiday in holidays.data.value?.items"
          :key="holiday.id"
          class="calendar-event"
        >
          <div class="date-tile">
            <span>{{ dateLabel(holiday.date, 'MMM') }}</span
            ><strong>{{ dateLabel(holiday.date, 'dd') }}</strong>
          </div>
          <div>
            <strong>{{ holiday.name }}</strong
            ><small>Company calendar</small>
          </div>
        </div></QueryState
      >
      <div class="gentle-note">
        <AppIcon name="heart" />
        <p>Good work starts with a little balance. Remember to make time for yourself.</p>
      </div>
    </section>
  </div>
  <section class="panel activity-panel">
    <div class="section-heading">
      <div>
        <h2>Around your workspace</h2>
        <p>The latest updates, without the noise</p>
      </div>
      <NuxtLink to="/notifications" class="text-link"
        >All updates<AppIcon name="arrow-right"
      /></NuxtLink>
    </div>
    <QueryState
      :pending="notices.isPending.value"
      :error="notices.error.value"
      :empty="!notices.data.value?.items.length"
      @retry="notices.refetch()"
      ><div class="activity-grid">
        <div
          v-for="item in notices.data.value?.items.slice(0, 3)"
          :key="item.id"
          class="activity-item"
        >
          <span class="activity-dot" />
          <div>
            <strong>{{ item.title }}</strong>
            <p>{{ item.detail || 'Your workspace has a new update.' }}</p>
            <small>{{ dateLabel(item.createdAt, 'MMM d · h:mm a') }}</small>
          </div>
        </div>
      </div></QueryState
    >
  </section>
  <ResourceForm
    v-model:visible="showLeave"
    kind="leave"
    @saved="(row) => navigateTo(`/leave/${row.id}`)"
  /><ResourceForm
    v-model:visible="showRequest"
    kind="request"
    @saved="(row) => navigateTo(`/requests/${row.id}`)"
  />
</template>
