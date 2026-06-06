<script setup lang="ts">
import { shallowRef, type Component } from 'vue'
import LoginForm from '@/components/LoginForm.vue'
import SignupForm from '@/components/SignupForm.vue'
import ForgotPasswordForm from '@/components/ForgotPasswordForm.vue'

const currentForm = shallowRef<Component>(LoginForm)
</script>

<template>
  <div class="auth">
    <div class="auth-card">
      <div class="logo">🍽️</div>
      <h1 class="title">FoodRank</h1>
      <component
        :is="currentForm"
        @go-to-login="currentForm = LoginForm"
        @go-to-signup="currentForm = SignupForm"
        @go-to-forgot="currentForm = ForgotPasswordForm"
      />
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
