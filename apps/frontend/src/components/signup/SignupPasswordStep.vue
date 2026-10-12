<script setup lang="ts">
import { computed } from 'vue'
import SignupStepLayout from '@/components/signup/SignupStepLayout.vue'
import PasswordCriteria from '@/components/signup/PasswordCriteria.vue'
import { useSignupDraft } from '@/composables/useSignupDraft'
import { isValidPassword, signupStepRoute } from '@/utils/signup'

const emit = defineEmits<{
  /** The password follows the rules: open the personal data step */
  continue: []
}>()

const { draft } = useSignupDraft()

const canContinue = computed(() => isValidPassword(draft.password))

function submit() {
  if (canContinue.value) emit('continue')
}
</script>

<template>
  <SignupStepLayout :step="2" title="Create a password" :back-to="signupStepRoute(1)">
    <form class="form" @submit.prevent="submit">
      <label class="label" for="signup-password">Password</label>
      <input
        id="signup-password"
        v-model="draft.password"
        class="input"
        type="password"
        placeholder="Choose a password"
        autocomplete="new-password"
        required
      />

      <PasswordCriteria :password="draft.password" />

      <button class="btn-primary" type="submit" :disabled="!canContinue">Continue</button>
    </form>
  </SignupStepLayout>
</template>

<style scoped lang="scss">
@use '@/styles/auth-forms';
</style>
