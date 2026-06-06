<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  'go-to-signup': []
  'go-to-forgot': []
}>()

const { login } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
  } catch {
    error.value = 'Invalid email or password.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <p class="subtitle">Track and rank your restaurant experiences.</p>

  <div class="tabs">
    <button class="active" type="button">Sign in</button>
    <button type="button" @click="emit('go-to-signup')">Sign up</button>
  </div>

  <form class="form" @submit.prevent="submit">
    <label class="label" for="login-email">Email address</label>
    <input
      id="login-email"
      v-model="email"
      class="input"
      type="email"
      placeholder="you@example.com"
      autocomplete="email"
      :disabled="loading"
      required
    />

    <label class="label" for="login-password">Password</label>
    <input
      id="login-password"
      v-model="password"
      class="input"
      type="password"
      placeholder="Your password"
      autocomplete="current-password"
      :disabled="loading"
      required
    />

    <p v-if="error" class="error">{{ error }}</p>

    <button class="btn-primary" type="submit" :disabled="loading">
      <span v-if="loading" class="spinner" />
      <span v-else>Sign in</span>
    </button>

    <button type="button" class="btn-link" @click="emit('go-to-forgot')">
      Forgot your password?
    </button>
  </form>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';
</style>
