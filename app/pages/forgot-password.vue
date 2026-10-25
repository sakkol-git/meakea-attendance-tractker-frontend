<script setup lang="ts">
import { forgotPasswordForm } from '~/schemas/forms'
definePageMeta({ layout: false })
const session = useSessionStore()
const values = reactive({ email: '' })
const error = ref('')
const message = ref('')
const busy = ref(false)

async function submit() {
  error.value = ''
  message.value = ''
  const result = forgotPasswordForm.safeParse(values)
  if (!result.success) {
    error.value = result.error.issues[0]!.message
    return
  }
  busy.value = true
  try {
    await session.forgotPassword(result.data.email)
    message.value =
      'If an account exists with this email address, password reset instructions have been sent. Check your inbox.'
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Password reset request could not be completed. Check your connection and try again.'
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
        <span class="eyebrow">ACCOUNT RECOVERY</span>
        <h1>Forgotten your password?<br />We’ll help you back in.</h1>
        <p>
          Enter your work email address and we'll send a secure link to reset your account
          credentials.
        </p>
        <div class="login-art">
          <span class="art-orbit" /><span class="art-orbit second" />
          <span class="art-card"><AppIcon name="lock" />Safe and encrypted recovery.</span>
        </div>
      </div>
      <small>Protecting your workspace identity.</small>
    </section>

    <section class="login-form">
      <div class="login-box">
        <span class="eyebrow">SELF-SERVICE RECOVERY</span>
        <h2>Reset your password</h2>
        <p>Enter your email to receive recovery instructions.</p>

        <div v-if="message" class="gentle-note auth-note" role="status">
          <AppIcon name="check-circle" />
          <p>{{ message }}</p>
        </div>

        <form v-else class="app-form" @submit.prevent="submit">
          <div class="field">
            <label for="email">Work email</label>
            <PInputText
              id="email"
              v-model="values.email"
              type="email"
              autocomplete="email"
              placeholder="you@company.com"
              required
            />
          </div>
          <PButton type="submit" label="Send reset instructions" :loading="busy" />
        </form>

        <p v-if="error" role="alert" class="form-error">{{ error }}</p>

        <div class="auth-back-link">
          <NuxtLink to="/login" class="text-link">
            <AppIcon name="arrow-left" /> Back to sign in
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
