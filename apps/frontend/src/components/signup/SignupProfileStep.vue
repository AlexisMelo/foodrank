<script setup lang="ts">
import axios from 'axios'
import { computed, shallowRef } from 'vue'
import SignupStepLayout from '@/components/signup/SignupStepLayout.vue'
import { useAuth } from '@/composables/useAuth'
import { useSignupDraft } from '@/composables/useSignupDraft'
import {
  IDENTITIES,
  MAX_AGE,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  isValidAge,
  isValidUsername,
  signupStepRoute,
  toSignupData,
} from '@/utils/signup'

const { signup } = useAuth()
const { draft, resetDraft } = useSignupDraft()

const loading = shallowRef(false)
const error = shallowRef('')

/** Request body, null while a field is missing or invalid (the Sign up button stays disabled). */
const signupData = computed(() => toSignupData(draft))

// Hints only show once a field is filled, so an empty form is not shown in error
const usernameHint = computed(() =>
  draft.username.trim() && !isValidUsername(draft.username)
    ? `Between ${USERNAME_MIN_LENGTH} and ${USERNAME_MAX_LENGTH} characters.`
    : '',
)
const ageHint = computed(() =>
  draft.age !== '' && !isValidAge(draft.age) ? `Enter an age between 0 and ${MAX_AGE}.` : '',
)

/**
 * Message shown when the sign up fails: the API explains a 409 (email or pseudonym already used).
 */
function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const apiMessage: unknown = err.response?.data?.error
    if (err.response?.status === 409)
      return typeof apiMessage === 'string'
        ? apiMessage
        : 'This email or pseudonym is already used.'
    if (err.response?.status === 400)
      return 'Some of your information was refused. Please check it.'
  }
  return 'Could not create account.'
}

async function submit() {
  if (!signupData.value) return
  error.value = ''
  loading.value = true
  try {
    await signup(signupData.value)
    resetDraft()
  } catch (err) {
    error.value = errorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <SignupStepLayout :step="3" title="Enter your personal data" :back-to="signupStepRoute(2)">
    <form class="form" @submit.prevent="submit">
      <label class="label" for="signup-username">Pseudonym</label>
      <input
        id="signup-username"
        v-model="draft.username"
        class="input"
        type="text"
        placeholder="How others will see you"
        autocomplete="nickname"
        :minlength="USERNAME_MIN_LENGTH"
        :maxlength="USERNAME_MAX_LENGTH"
        :disabled="loading"
        required
      />
      <p v-if="usernameHint" class="field-hint">{{ usernameHint }}</p>

      <label class="label" for="signup-age">Age</label>
      <input
        id="signup-age"
        v-model="draft.age"
        class="input"
        type="number"
        inputmode="numeric"
        min="0"
        :max="MAX_AGE"
        step="1"
        placeholder="Your age"
        :disabled="loading"
        required
      />
      <p v-if="ageHint" class="field-hint">{{ ageHint }}</p>

      <label class="label" for="signup-identity">Identity</label>
      <select
        id="signup-identity"
        v-model="draft.identity"
        class="input select"
        :disabled="loading"
        required
      >
        <option value="" disabled>Select your identity</option>
        <option v-for="identity in IDENTITIES" :key="identity.value" :value="identity.value">
          {{ identity.label }}
        </option>
      </select>

      <p v-if="error" class="error">{{ error }}</p>

      <button class="btn-primary" type="submit" :disabled="loading || !signupData">
        <span v-if="loading" class="spinner" />
        <span v-else>Sign up</span>
      </button>
    </form>
  </SignupStepLayout>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';

.field-hint {
  font-size: 12px;
  color: #ff6b6b;
  margin: -4px 0 0;
}

.select {
  appearance: none;
  cursor: pointer;
  padding-right: 40px;
  // Chevron drawn in the field, since the native one is hidden by appearance: none
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
  background-size: 16px;

  // Placeholder option still selected
  &:invalid {
    color: rgba(255, 255, 255, 0.2);
  }

  option {
    background: #111111;
    color: #ffffff;
  }
}
</style>
