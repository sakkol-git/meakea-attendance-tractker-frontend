<script setup lang="ts">
import { loginForm } from '~/schemas/forms'
definePageMeta({ layout: false })
const session = useSessionStore()
const route = useRoute()
const values = reactive({ tenant: '', email: '', password: '' })
const error = ref('')
const busy = ref(false)
async function submit() {
  error.value = ''
  const result = loginForm.safeParse(values)
  if (!result.success) {
    error.value = result.error.issues[0]!.message
    return
  }
  busy.value = true
  try {
    await session.signIn(result.data)
    const next = String(route.query.returnTo || '/')
    await navigateTo(next.startsWith('/') && !next.startsWith('//') ? next : '/')
  } catch {
    error.value =
      'Sign-in could not be completed. Check your details and connection, then try again.'
  } finally {
    values.password = ''
    busy.value = false
  }
}
async function demo() {
  busy.value = true
  try {
    await session.enterDemo()
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unable to open the demo.'
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
        <span class="eyebrow">PEOPLE FIRST. EVERY DAY.</span>
        <h1>A little more flow.<br />A lot more human.</h1>
        <p>
          Your people, workdays, and small wins.<br />All connected in one thoughtful workspace.
        </p>
        <div class="login-art">
          <span class="art-orbit" /><span class="art-orbit second" /><span class="art-card"
            ><AppIcon name="check-circle" />A good day, together.</span
          >
        </div>
      </div>
      <small>Built around the way people work.</small>
    </section>
    <section class="login-form">
      <div class="login-box">
        <span class="eyebrow">WELCOME TO YOUR WORKSPACE</span>
        <h2>Good to have you here.</h2>
        <p>Sign in to find your workday, a little simpler.</p>
        <p v-if="route.query.logout" role="status" class="form-error">
          Signed out on this device. Server session revocation was not confirmed; contact your
          administrator if needed.
        </p>
        <template v-if="session.mode === 'local'"
          ><div class="demo-intro">
            <AppIcon name="flask" />
            <h3>Explore the demo</h3>
            <p>
              Try the complete interface with synthetic people and requests. Nothing is sent to a
              live HR system. Changes reset when the page reloads.
            </p>
          </div>
          <PButton
            label="Open demo workspace"
            icon="pi pi-arrow-right"
            :loading="busy"
            @click="demo"
        /></template>
        <form v-else class="app-form" @submit.prevent="submit">
          <div class="field">
            <label for="tenant">Workspace</label
            ><PInputText id="tenant" v-model="values.tenant" autocomplete="organization" required />
          </div>
          <div class="field">
            <label for="email">Work email</label
            ><PInputText
              id="email"
              v-model="values.email"
              type="email"
              autocomplete="username"
              required
            />
          </div>
          <div class="field">
            <label for="password">Password</label
            ><PInputText
              id="password"
              v-model="values.password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <div class="field-actions">
            <NuxtLink to="/forgot-password" class="text-link"> Forgot password? </NuxtLink>
          </div>
          <PButton type="submit" label="Sign in" :loading="busy" />
          <p class="small-note">
            Need an account or self-service help? You can
            <NuxtLink to="/forgot-password" class="text-link">reset your password</NuxtLink>,
            <NuxtLink to="/setup" class="text-link">set up a workspace</NuxtLink>, or contact your
            workspace administrator.
          </p>
        </form>
        <p v-if="error" role="alert" class="form-error">{{ error }}</p>
        <NuxtLink v-if="session.profile" to="/" class="text-link"
          >Return to workspace<AppIcon name="arrow-right"
        /></NuxtLink>
      </div>
    </section>
  </main>
</template>
