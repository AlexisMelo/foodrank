<script setup lang="ts">
import axios from 'axios'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { checkSession } = useAuth()

const password = ref('')
const loading = ref(false)
const error = ref('')
const accessToken = ref('')
const refreshToken = ref('')
const invalidLink = ref(false)

onMounted(() => {
  const params = new URLSearchParams(window.location.hash.substring(1))
  const token = params.get('access_token')
  const refresh = params.get('refresh_token')
  const type = params.get('type')

  if (!token || !refresh || type !== 'recovery') {
    invalidLink.value = true
    return
  }

  accessToken.value = token
  refreshToken.value = refresh
  history.replaceState(null, '', window.location.pathname)
})

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await axios.post(
      `${import.meta.env.VITE_API_BASE_URL}/api/auth/reset-password`,
      { accessToken: accessToken.value, refreshToken: refreshToken.value, password: password.value },
      { withCredentials: true },
    )
    await checkSession()
    router.replace('/')
  } catch {
    error.value = 'Could not reset password. The link may have expired.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <template v-if="invalidLink">
    <div class="invalid">
      <p class="invalid-title">Invalid or expired link</p>
      <p class="invalid-body">Request a new reset link from the sign-in page.</p>
    </div>
    <button type="button" class="btn-link" @click="router.replace('/')">← Back to sign in</button>
  </template>

  <template v-else>
    <p class="subtitle">Choose a new password for your account.</p>

    <form class="form" @submit.prevent="submit">
      <label class="label" for="new-password">New password</label>
      <input
        id="new-password"
        v-model="password"
        class="input"
        type="password"
        placeholder="Choose a strong password"
        autocomplete="new-password"
        :disabled="loading"
        required
      />

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn-primary" type="submit" :disabled="loading">
        <span v-if="loading" class="spinner" />
        <span v-else>Set new password</span>
      </button>
    </form>
  </template>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';

.invalid {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  padding: 12px 0 4px;
}

.invalid-title {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.invalid-body {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  line-height: 1.5;
}
</style>
