<script setup lang="ts">
import axios from 'axios'
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

type Mode = 'login' | 'signup'

const { login, signup } = useAuth()

const mode = ref<Mode>('login')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  loading.value = true
  try {
    if (mode.value === 'login') {
      await login(email.value.trim(), password.value)
    } else {
      await signup(email.value.trim(), password.value)
    }
  } catch (err) {
    if (mode.value === 'login') {
      errorMessage.value = 'Invalid email or password.'
    } else if (axios.isAxiosError(err) && err.response?.status === 409) {
      errorMessage.value = 'An account with this email already exists.'
    } else {
      errorMessage.value = 'Could not create account.'
    }
  } finally {
    loading.value = false
  }
}

function switchMode(next: Mode) {
  mode.value = next
  errorMessage.value = ''
}
</script>

<template>
  <div class="auth">
    <div class="auth-card">
      <div class="logo">🍽️</div>
      <h1 class="title">FoodRank</h1>
      <p class="subtitle">Track and rank your restaurant experiences.</p>

      <div class="tabs">
        <button :class="{ active: mode === 'login' }" @click="switchMode('login')">Sign in</button>
        <button :class="{ active: mode === 'signup' }" @click="switchMode('signup')">
          Sign up
        </button>
      </div>

      <form class="form" @submit.prevent="submit">
        <label class="label" for="email">Email address</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          placeholder="you@example.com"
          autocomplete="email"
          :disabled="loading"
          required
        />

        <label class="label" for="password">Password</label>
        <input
          id="password"
          v-model="password"
          class="input"
          type="password"
          :placeholder="mode === 'signup' ? 'Choose a password' : 'Your password'"
          :autocomplete="mode === 'signup' ? 'new-password' : 'current-password'"
          :disabled="loading"
          required
        />

        <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

        <button class="btn-primary" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span v-else>{{ mode === 'login' ? 'Sign in' : 'Create account' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.auth-card {
  position: relative;
  background: #1a1a1a;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  border-radius: 24px;
  padding: 36px 28px;
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.logo {
  font-size: 40px;
  line-height: 1;
  margin-bottom: 4px;
}

.title {
  font-size: 22px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: -0.4px;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  margin: 0 0 8px;
  line-height: 1.5;
}

.tabs {
  display: flex;
  gap: 4px;
  background: #111;
  border-radius: 12px;
  padding: 4px;
  width: 100%;
  margin-bottom: 8px;

  button {
    flex: 1;
    padding: 8px;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: rgba(255, 255, 255, 0.4);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
    font-family: inherit;

    &.active {
      background: #2a2a2a;
      color: #fff;
    }
  }
}

.form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.3px;
}

.input {
  width: 100%;
  background: #111111;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
  color: #ffffff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
  &:focus {
    border-color: rgba(255, 255, 255, 0.35);
  }
  &:disabled {
    opacity: 0.5;
  }
}

.error {
  font-size: 12px;
  color: #ff6b6b;
  margin: 0;
}

.btn-primary {
  width: 100%;
  margin-top: 6px;
  padding: 13px;
  background: #ffffff;
  color: #0d0d0d;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  transition:
    opacity 0.2s,
    transform 0.15s;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:active:not(:disabled) {
    transform: scale(0.98);
  }
  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(0, 0, 0, 0.2);
  border-top-color: #0d0d0d;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
