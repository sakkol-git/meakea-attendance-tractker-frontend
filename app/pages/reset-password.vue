<script setup lang="ts">
import { resetPasswordForm } from '~/schemas/forms'
definePageMeta({ layout: false })
const route = useRoute()
const session = useSessionStore()
const values = reactive({
  token: (route.query.token as string) || '',
  password: '',
  confirmPassword: '',
})
const error = ref('')
const success = ref(false)
const busy = ref(false)

async function submit() {
  error.value = ''
  const result = resetPasswordForm.safeParse(values)
  if (!result.success) {
    error.value = result.error.issues[0]!.message
    return
  }
  busy.value = true
  try {
    await session.resetPassword({
      token: result.data.token,
      newPassword: result.data.password,
    })
    success.value = true
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Password reset could not be completed. Your token may be expired or invalid.'
  } finally {
    values.password = ''
    values.confirmPassword = ''
    busy.value = false
  }
}
</script>

<template>
  <main class="login-shell">
    <section class="login-story">
      <NuxtLink to="/" class="brand"><span class="brand-mark">hf</span>HRFlow.</NuxtLink>
      <div>
        <span class="eyebrow">CHOOSE NEW CREDENTIALS</span>
        <h1>Secure your workspace.<br />Create a strong password.</h1>
        <p>Pick a passphrase of at least eight characters that you don't use on other services.</p>
        <div class="login-art">
          <span class="art-orbit" /><span class="art-orbit second" />
          <span class="art-card"><AppIcon name="shield" />Encrypted credential update.</span>
        </div>
      </div>
      <small>Protecting your account integrity.</small>
    </section>

    <section class="login-form">
      <div class="login-box">
        <span class="eyebrow">AUTHENTICATION</span>
        <h2>Set new password</h2>
        <p>Choose a secure new password for your account.</p>

        <div v-if="success" class="gentle-note auth-note" role="status">
          <AppIcon name="check-circle" />
          <div>
            <strong class="auth-success-title">Password reset complete!</strong>
            <p>Your password has been updated. You can now sign in with your new credentials.</p>
          </div>
        </div>
        <div v-if="success" class="auth-back-link">
          <NuxtLink to="/login" class="p-button auth-action-btn">
            Sign in now <AppIcon name="arrow-right" />
          </NuxtLink>
        </div>

        <form v-else class="app-form" @submit.prevent="submit">
          <div v-if="!route.query.token" class="field">
            <label for="token">Reset token</label>
            <PInputText
              id="token"
              v-model="values.token"
              autocomplete="one-time-code"
              placeholder="Paste token from recovery email"
              required
            />
          </div>
          <div class="field">
            <label for="password">New password</label>
            <PInputText
              id="password"
              v-model="values.password"
              type="password"
              autocomplete="new-password"
              placeholder="Minimum 8 characters"
              required
            />
          </div>
          <div class="field">
            <label for="confirmPassword">Confirm new password</label>
            <PInputText
              id="confirmPassword"
              v-model="values.confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="Re-enter new password"
              required
            />
          </div>
          <PButton type="submit" label="Update password" :loading="busy" />
        </form>

        <p v-if="error" role="alert" class="form-error">{{ error }}</p>

        <div v-if="!success" class="auth-back-link">
          <NuxtLink to="/login" class="text-link">
            <AppIcon name="arrow-left" /> Back to sign in
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
