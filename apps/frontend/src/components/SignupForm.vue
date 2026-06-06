<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  'go-to-login': []
}>()

const { signup } = useAuth()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await signup(email.value.trim(), password.value)
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 409) {
      error.value = 'An account with this email already exists.'
    } else {
      error.value = 'Could not create account.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <p class="subtitle">Track and rank your restaurant experiences.</p>

  <div class="tabs">
    <button type="button" @click="emit('go-to-login')">Sign in</button>
    <button class="active" type="button">Sign up</button>
  </div>

  <form class="form" @submit.prevent="submit">
    <label class="label" for="signup-email">Email address</label>
    <input
      id="signup-email"
      v-model="email"
      class="input"
      type="email"
      placeholder="you@example.com"
      autocomplete="email"
      :disabled="loading"
      required
    />

    <label class="label" for="signup-password">Password</label>
    <input
      id="signup-password"
      v-model="password"
      class="input"
      type="password"
      placeholder="Choose a password"
      autocomplete="new-password"
      :disabled="loading"
      required
    />

    <p v-if="error" class="error">{{ error }}</p>

    <button class="btn-primary" type="submit" :disabled="loading">
      <span v-if="loading" class="spinner" />
      <span v-else>Create account</span>
    </button>
  </form>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';
</style>
