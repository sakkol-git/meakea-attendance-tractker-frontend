<script setup lang="ts">
const api = useWorkspace()
const session = useSessionStore()
const appearance = useAppearanceStore()
const feedback = useFeedback()
const result = useWorkspaceQuery('preferences', () => api.preferences())
const values = reactive({ email: true, inApp: true, reminders: true })
const dirty = ref(false)
watch(
  result.data,
  (data) => {
    if (data && !dirty.value)
      Object.assign(values, {
        email: data.data.email,
        inApp: data.data.inApp,
        reminders: data.data.reminders,
      })
  },
  { immediate: true },
)
async function save() {
  const response = await feedback.run(
    () => api.savePreferences({ ...values }, result.data.value?.etag),
    'Preferences saved',
  )
  if (response) {
    dirty.value = false
    await result.refetch()
  }
}
const options = [
  {
    key: 'email' as const,
    title: 'Email updates',
    detail: 'Request decisions and important workspace updates.',
  },
  {
    key: 'inApp' as const,
    title: 'In-app notifications',
    detail: 'Optional workspace updates. Required approval updates remain in your inbox.',
  },
  {
    key: 'reminders' as const,
    title: 'Helpful reminders',
    detail: 'A little nudge for workday tasks that need attention.',
  },
]
</script>
<template>
  <PageHeading
    title="Settings"
    description="A workspace that works a little more like you."
    eyebrow="MAKE IT YOURS"
  />
  <div class="detail-grid">
    <section class="panel">
      <div class="field appearance-preference">
        <label for="appearance">Appearance</label>
        <PSelect
          input-id="appearance"
          aria-label="Appearance"
          v-model="appearance.preference"
          :options="[
            { label: 'Use device setting', value: 'system' },
            { label: 'Light', value: 'light' },
            { label: 'Dark', value: 'dark' },
          ]"
          option-label="label"
          option-value="value"
          aria-describedby="appearance-help"
        />
        <small id="appearance-help"
          >Applies to this browser. Notification preferences are saved separately.</small
        >
      </div>
      <div class="section-heading">
        <div>
          <h2>Keep me in the loop</h2>
          <p>Choose how you hear from your workspace.</p>
        </div>
        <AppIcon name="bell" />
      </div>
      <QueryState
        :pending="result.isPending.value"
        :error="result.error.value"
        @retry="result.refetch()"
        ><form @submit.prevent="save">
          <div v-for="option in options" :key="option.key" class="preference-row">
            <label :for="`pref-${option.key}`"
              ><strong>{{ option.title }}</strong
              ><span>{{ option.detail }}</span></label
            ><PToggleSwitch
              v-model="values[option.key]"
              :input-id="`pref-${option.key}`"
              @update:model-value="dirty = true"
            />
          </div>
          <p v-if="feedback.error.value" role="alert" class="form-error">
            {{ feedback.error.value }}
          </p>
          <div class="dialog-actions">
            <PButton
              label="Save preferences"
              type="submit"
              :loading="feedback.busy.value"
              :disabled="!dirty"
            />
          </div></form
      ></QueryState>
    </section>
    <aside class="panel">
      <h2>About your workspace</h2>
      <NuxtLink to="/help" class="text-link">Help and getting started</NuxtLink>
      <dl class="detail-list">
        <div>
          <dt>Language</dt>
          <dd>English</dd>
        </div>
        <div>
          <dt>Time zone</dt>
          <dd>{{ session.profile?.timeZone }}</dd>
        </div>
        <div>
          <dt>Connection</dt>
          <dd>{{ session.mode === 'local' ? 'Synthetic demo' : 'Remote API' }}</dd>
        </div>
      </dl>
      <p class="small-note">
        Language and time zone are managed by your workspace. Contact your administrator for a
        change.
      </p>
    </aside>
  </div>
</template>
