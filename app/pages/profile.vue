<script setup lang="ts">
import { profileForm, changePasswordForm } from '~/schemas/forms'
import { initials, titleCase } from '~/utils/format'

const session = useSessionStore()

const editProfileOpen = ref(false)
const changePasswordOpen = ref(false)

const profileValues = reactive({
  name: session.profile?.name || '',
  timeZone: session.profile?.timeZone || 'Asia/Phnom_Penh',
})

const passwordValues = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const profileError = ref('')
const profileSuccess = ref('')
const profileBusy = ref(false)

const passwordError = ref('')
const passwordSuccess = ref('')
const passwordBusy = ref(false)

watch(
  () => session.profile,
  (p) => {
    if (p) {
      profileValues.name = p.name
      profileValues.timeZone = p.timeZone
    }
  },
  { immediate: true },
)

async function saveProfile() {
  profileError.value = ''
  profileSuccess.value = ''
  const result = profileForm.safeParse(profileValues)
  if (!result.success) {
    profileError.value = result.error.issues[0]!.message
    return
  }
  profileBusy.value = true
  try {
    await session.updateProfile(result.data)
    profileSuccess.value = 'Profile updated successfully.'
    editProfileOpen.value = false
  } catch (e) {
    profileError.value = e instanceof Error ? e.message : 'Failed to update profile.'
  } finally {
    profileBusy.value = false
  }
}

async function savePassword() {
  passwordError.value = ''
  passwordSuccess.value = ''
  const result = changePasswordForm.safeParse(passwordValues)
  if (!result.success) {
    passwordError.value = result.error.issues[0]!.message
    return
  }
  passwordBusy.value = true
  try {
    await session.changePassword({
      currentPassword: result.data.currentPassword,
      newPassword: result.data.newPassword,
    })
    passwordSuccess.value = 'Password changed successfully.'
    passwordValues.currentPassword = ''
    passwordValues.newPassword = ''
    passwordValues.confirmPassword = ''
    changePasswordOpen.value = false
  } catch (e) {
    passwordError.value = e instanceof Error ? e.message : 'Failed to change password.'
  } finally {
    passwordBusy.value = false
  }
}
</script>

<template>
  <PageHeading
    title="My profile"
    description="Your place in the bigger picture."
    eyebrow="A LITTLE ABOUT YOU"
  />

  <section class="panel profile-panel">
    <div class="profile-header">
      <div class="profile-lead">
        <span class="avatar large">{{ initials(session.profile?.name || '') }}</span>
        <div>
          <h2>{{ session.profile?.name }}</h2>
          <p>{{ session.profile?.position || 'Position not provided' }}</p>
          <StatusBadge status="ACTIVE" />
        </div>
      </div>
      <div class="profile-actions">
        <PButton
          label="Edit details"
          icon="pi pi-user-edit"
          size="small"
          outlined
          @click="editProfileOpen = !editProfileOpen"
        />
        <PButton
          label="Change password"
          icon="pi pi-key"
          size="small"
          outlined
          @click="changePasswordOpen = !changePasswordOpen"
        />
      </div>
    </div>

    <div v-if="profileSuccess" class="gentle-note auth-note" role="status">
      <AppIcon name="check-circle" />
      <p>{{ profileSuccess }}</p>
    </div>
    <div v-if="passwordSuccess" class="gentle-note auth-note" role="status">
      <AppIcon name="check-circle" />
      <p>{{ passwordSuccess }}</p>
    </div>

    <!-- Edit Profile Form -->
    <div v-if="editProfileOpen" class="panel profile-subpanel">
      <h3 class="form-heading">Edit your profile details</h3>
      <form class="app-form" @submit.prevent="saveProfile">
        <div class="field">
          <label for="profileName">Preferred name</label>
          <PInputText id="profileName" v-model="profileValues.name" required />
        </div>
        <div class="field">
          <label for="profileTimeZone">Time zone</label>
          <PInputText
            id="profileTimeZone"
            v-model="profileValues.timeZone"
            placeholder="e.g. Asia/Phnom_Penh"
            required
          />
        </div>
        <p v-if="profileError" role="alert" class="form-error">{{ profileError }}</p>
        <div class="button-row">
          <PButton
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            size="small"
            @click="editProfileOpen = false"
          />
          <PButton type="submit" label="Save details" :loading="profileBusy" size="small" />
        </div>
      </form>
    </div>

    <!-- Change Password Form -->
    <div v-if="changePasswordOpen" class="panel profile-subpanel">
      <h3 class="form-heading">Update your password</h3>
      <form class="app-form" @submit.prevent="savePassword">
        <div class="field">
          <label for="currentPassword">Current password</label>
          <PInputText
            id="currentPassword"
            v-model="passwordValues.currentPassword"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <div class="field">
          <label for="newPassword">New password</label>
          <PInputText
            id="newPassword"
            v-model="passwordValues.newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="Minimum 8 characters"
            required
          />
        </div>
        <div class="field">
          <label for="confirmNewPassword">Confirm new password</label>
          <PInputText
            id="confirmNewPassword"
            v-model="passwordValues.confirmPassword"
            type="password"
            autocomplete="new-password"
            required
          />
        </div>
        <p v-if="passwordError" role="alert" class="form-error">{{ passwordError }}</p>
        <div class="button-row">
          <PButton
            type="button"
            label="Cancel"
            severity="secondary"
            outlined
            size="small"
            @click="changePasswordOpen = false"
          />
          <PButton type="submit" label="Update password" :loading="passwordBusy" size="small" />
        </div>
      </form>
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
      <AppIcon name="shield" />
      <p>
        Workspace credentials and self-service changes are verified by your identity service.
        Contact your workspace administrator if you need role changes or account reassignment.
      </p>
    </div>
  </section>
</template>
