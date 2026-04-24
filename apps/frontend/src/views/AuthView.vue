<script setup lang="ts">
import { ref } from 'vue'

type State = 'idle' | 'loading' | 'success' | 'error'

const email = ref('')
const state = ref<State>('idle')
const errorMessage = ref('')

async function sendMagicLink() {
  const trimmed = email.value.trim()
  if (!trimmed) return

  state.value = 'loading'
  errorMessage.value = ''

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: trimmed }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    errorMessage.value = data.error ?? 'Something went wrong'
    state.value = 'error'
  } else {
    state.value = 'success'
  }
}

function reset() {
  email.value = ''
  state.value = 'idle'
  errorMessage.value = ''
}
</script>

<template>
  <div class="auth">
    <div class="auth-card">
      <div class="logo">🍽️</div>
      <h1 class="title">FoodRank</h1>
      <p class="subtitle">Sign in to track and rank your restaurant experiences.</p>

      <Transition name="fade" mode="out-in">
        <div v-if="state === 'success'" class="success-state" key="success">
          <div class="success-icon">✉️</div>
          <p class="success-title">Check your inbox</p>
          <p class="success-body">
            We sent a sign-in link to <strong>{{ email }}</strong
            >.
          </p>
          <button class="btn-secondary" @click="reset">Use a different email</button>
        </div>

        <form v-else class="form" key="form" @submit.prevent="sendMagicLink">
          <label class="label" for="email">Email address</label>
          <input
            id="email"
            v-model="email"
            class="input"
            type="email"
            placeholder="you@example.com"
            autocomplete="email"
            :disabled="state === 'loading'"
            required
          />

          <p v-if="state === 'error'" class="error">{{ errorMessage }}</p>

          <button class="btn-primary" type="submit" :disabled="state === 'loading'">
            <span v-if="state === 'loading'" class="spinner" />
            <span v-else>Send magic link</span>
          </button>
        </form>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.auth-card {
  position: relative;
  width: 100%;
  background: #1a1a1a;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  border-radius: 24px;
  padding: 36px 28px;
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
  margin: 0 0 16px;
  line-height: 1.5;
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
}
.input::placeholder {
  color: rgba(255, 255, 255, 0.2);
}
.input:focus {
  border-color: rgba(255, 255, 255, 0.35);
}
.input:disabled {
  opacity: 0.5;
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
}
.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-primary:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: default;
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

.success-state {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  padding: 8px 0;
}

.success-icon {
  font-size: 36px;
  line-height: 1;
  margin-bottom: 4px;
}

.success-title {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.success-body {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  line-height: 1.5;
}
.success-body strong {
  color: rgba(255, 255, 255, 0.75);
  font-weight: 700;
}

.btn-secondary {
  margin-top: 8px;
  background: none;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  padding: 8px 16px;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s;
}
.btn-secondary:hover {
  border-color: rgba(255, 255, 255, 0.35);
  color: rgba(255, 255, 255, 0.75);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
