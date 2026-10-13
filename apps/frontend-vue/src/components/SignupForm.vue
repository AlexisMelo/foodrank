<script setup lang="ts">
import { useSignupDraft } from '@/composables/useSignupDraft'

const emit = defineEmits<{
  'go-to-login': []
  /** The email is entered: open the password step */
  continue: []
}>()

const { draft } = useSignupDraft()

function submit() {
  draft.email = draft.email.trim()
  emit('continue')
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
      v-model="draft.email"
      class="input"
      type="email"
      placeholder="you@example.com"
      autocomplete="email"
      required
    />

    <button class="btn-primary" type="submit">Create account</button>
  </form>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';
</style>
