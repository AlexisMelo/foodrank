<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  'go-to-login': []
}>()

const email = ref('')
const loading = ref(false)
const sent = ref(false)

async function submit() {
  loading.value = true
  try {
    // TODO: call POST /api/auth/forgot-password when backend is ready
    await new Promise((resolve) => setTimeout(resolve, 600))
    sent.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <p class="subtitle">Enter your email and we'll send you a reset link.</p>

  <template v-if="sent">
    <div class="success">
      <p class="success-title">Check your inbox</p>
      <p class="success-body">
        A reset link has been sent to <strong>{{ email }}</strong
        >.
      </p>
    </div>
  </template>

  <form v-else class="form" @submit.prevent="submit">
    <label class="label" for="forgot-email">Email address</label>
    <input
      id="forgot-email"
      v-model="email"
      class="input"
      type="email"
      placeholder="you@example.com"
      autocomplete="email"
      :disabled="loading"
      required
    />

    <button class="btn-primary" type="submit" :disabled="loading">
      <span v-if="loading" class="spinner" />
      <span v-else>Send reset link</span>
    </button>
  </form>

  <button type="button" class="btn-link" @click="emit('go-to-login')">← Back to sign in</button>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';

.success {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: center;
  padding: 12px 0 4px;
}

.success-title {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.success-body {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  line-height: 1.5;

  strong {
    color: rgba(255, 255, 255, 0.75);
    font-weight: 700;
  }
}
</style>
