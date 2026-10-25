<script setup lang="ts">
import { setupWorkspaceForm } from '~/schemas/forms'

definePageMeta({ layout: false })

const session = useSessionStore()
const values = reactive({
  name: '',
  slug: '',
  ownerName: '',
  ownerEmail: '',
  bootstrapCode: '',
  timezone: 'Asia/Phnom_Penh',
  locale: 'en',
})

const error = ref('')
const busy = ref(false)
const review = ref(false)
const done = ref(false)

function validateInputs() {
  error.value = ''
  const result = setupWorkspaceForm.safeParse(values)
  if (!result.success) {
    error.value = result.error.issues[0]!.message
    return false
  }
  if (session.mode === 'remote' && !values.bootstrapCode?.trim()) {
    error.value = 'An authorized company setup code is required in remote mode.'
    return false
  }
  return true
}

function handleReview() {
  if (validateInputs()) {
    review.value = true
  }
}

async function submit() {
  if (!validateInputs()) return
  busy.value = true
  error.value = ''
  try {
    await session.setupWorkspace(values)
    done.value = true
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Company workspace could not be created. Verify your setup code and connection.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="login-shell">
    <section class="login-story">
      <NuxtLink to="/" class="brand"><span class="brand-mark">hf</span>HRFlow.</NuxtLink>
      <div>
        <span class="eyebrow">COMPANY ONBOARDING</span>
        <h1>Build a calmer workplace.<br />Start with your team.</h1>
        <p>
          Configure your organization boundary, initial administrator account, and company time
          zone.
        </p>
        <div class="login-art">
          <span class="art-orbit" /><span class="art-orbit second" />
          <span class="art-card"><AppIcon name="sitemap" />Strict logical data isolation.</span>
        </div>
      </div>
      <small>Enterprise tenant isolation &amp; role security.</small>
    </section>

    <section class="login-form">
      <div class="login-box">
        <span class="eyebrow">WORKSPACE SETUP</span>
        <h2>Set up a workspace</h2>
        <p>
          {{
            session.mode === 'local'
              ? 'Configure the fictional demo company. No real account or invitation is created.'
              : 'An authorized company setup code is required. Your service controls onboarding and owner invitation.'
          }}
        </p>

        <!-- Step 3: Done state -->
        <div v-if="done" class="setup-done" role="status">
          <div class="gentle-note auth-note">
            <AppIcon name="check-circle" />
            <div>
              <strong class="auth-success-title">Workspace created!</strong>
              <p>
                Follow the owner invitation supplied by your administrator, then sign in with your
                company workspace.
              </p>
            </div>
          </div>
          <div class="auth-back-link">
            <NuxtLink to="/login" class="p-button auth-action-btn">
              Continue to sign in <AppIcon name="arrow-right" />
            </NuxtLink>
          </div>
        </div>

        <!-- Step 2: Review state -->
        <div v-else-if="review" class="setup-review">
          <div class="review-card">
            <div class="review-row">
              <span class="review-label">Company</span>
              <strong class="review-value">{{ values.name }}</strong>
            </div>
            <div class="review-row">
              <span class="review-label">Workspace</span>
              <code class="review-code">{{ values.slug }}</code>
            </div>
            <div class="review-row">
              <span class="review-label">Owner</span>
              <strong class="review-value">{{ values.ownerName }}</strong>
            </div>
            <div class="review-row">
              <span class="review-label">Owner email</span>
              <span class="review-value">{{ values.ownerEmail }}</span>
            </div>
            <div class="review-row">
              <span class="review-label">Timezone</span>
              <span class="review-value">{{ values.timezone }}</span>
            </div>
          </div>

          <p class="small-note review-disclaimer">
            Confirm the company and owner details. Your setup authorization is sent only to the
            configured service.
          </p>

          <div class="button-group">
            <PButton label="Create workspace" icon="pi pi-check" :loading="busy" @click="submit" />
            <PButton label="Revise details" outlined :disabled="busy" @click="review = false" />
          </div>
          <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        </div>

        <!-- Step 1: Input form -->
        <form v-else class="app-form" @submit.prevent="handleReview">
          <div class="field">
            <label for="setup-name">Company name</label>
            <PInputText
              id="setup-name"
              v-model="values.name"
              placeholder="e.g. Acme Corporation"
              required
            />
          </div>

          <div class="field">
            <label for="setup-slug">Company workspace</label>
            <PInputText
              id="setup-slug"
              v-model="values.slug"
              placeholder="e.g. acme-corp"
              required
            />
            <small class="field-hint">Use 3–50 lowercase letters, numbers or hyphens.</small>
          </div>

          <div class="field">
            <label for="setup-owner-name">Owner name</label>
            <PInputText
              id="setup-owner-name"
              v-model="values.ownerName"
              placeholder="e.g. Jane Doe"
              required
            />
          </div>

          <div class="field">
            <label for="setup-owner-email">Owner work email</label>
            <PInputText
              id="setup-owner-email"
              v-model="values.ownerEmail"
              type="email"
              placeholder="jane@acme.com"
              required
            />
          </div>

          <div v-if="session.mode !== 'local'" class="field">
            <label for="setup-code">Company setup code</label>
            <PInputText
              id="setup-code"
              v-model="values.bootstrapCode"
              type="password"
              placeholder="Enter authorized bootstrap code"
              required
            />
          </div>

          <PButton type="submit" label="Review workspace" icon="pi pi-arrow-right" />

          <p v-if="error" role="alert" class="form-error">{{ error }}</p>

          <div class="auth-back-link">
            <NuxtLink to="/login" class="text-link">
              <AppIcon name="arrow-left" /> Back to sign in
            </NuxtLink>
          </div>
        </form>
      </div>
    </section>
  </main>
</template>
