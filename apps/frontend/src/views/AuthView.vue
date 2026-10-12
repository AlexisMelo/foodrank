<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LoginForm from '@/components/LoginForm.vue'
import SignupForm from '@/components/SignupForm.vue'
import ForgotPasswordForm from '@/components/ForgotPasswordForm.vue'
import SignupPasswordStep from '@/components/signup/SignupPasswordStep.vue'
import SignupProfileStep from '@/components/signup/SignupProfileStep.vue'
import { reachableSignupStep, signupStepRoute, type SignupStep } from '@/utils/signup'
import { useSignupDraft } from '@/composables/useSignupDraft'

const route = useRoute()
const router = useRouter()
const { draft } = useSignupDraft()

/** Sign up step shown on /signup (kept valid by the step guard), null on /login. */
const signupStep = computed(() =>
  route.path === '/signup' ? reachableSignupStep(route.query.step, draft) : null,
)

/** True while the login tab shows the forgot password form. */
const showForgot = shallowRef(false)

// Login and sign up are tabs of the same card: switching replaces the URL instead of adding a history entry
function goToLogin() {
  showForgot.value = false
  router.replace('/login')
}

function goToSignup() {
  router.replace(signupStepRoute(1))
}

function goToSignupStep(step: SignupStep) {
  router.push(signupStepRoute(step))
}
</script>

<template>
  <SignupPasswordStep v-if="signupStep === 2" @continue="goToSignupStep(3)" />
  <SignupProfileStep v-else-if="signupStep === 3" />
  <div v-else class="auth">
    <div class="auth-card">
      <div class="logo">🍽️</div>
      <h1 class="title">FoodRank</h1>
      <SignupForm v-if="signupStep === 1" @go-to-login="goToLogin" @continue="goToSignupStep(2)" />
      <ForgotPasswordForm v-else-if="showForgot" @go-to-login="goToLogin" />
      <LoginForm v-else @go-to-signup="goToSignup" @go-to-forgot="showForgot = true" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth {
  margin-top: 15dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.auth-card {
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
</style>
