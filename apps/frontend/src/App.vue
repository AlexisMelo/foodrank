<script setup lang="ts">
import BottomTabBar from '@/components/BottomTabBar.vue'
import NewReviewModal from '@/components/NewReviewModal.vue'
import AuthForm from '@/components/AuthForm.vue'
import { useAuth } from '@/composables/useAuth'

const { session, isReady } = useAuth()
</script>

<template>
  <div class="container">
    <template v-if="!isReady" />
    <AuthForm v-else-if="!session" />
    <template v-else>
      <RouterView />
      <BottomTabBar />
      <NewReviewModal />
    </template>
  </div>
</template>

<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  background: #111111;
  padding-bottom: 72px;
}

.container {
  max-width: 420px;
  margin: 0 auto;
  background: #0d0d0d;
  position: relative;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.6);
}
</style>
