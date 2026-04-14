<script setup lang="ts">
import BottomTabBar from '@/components/BottomTabBar.vue'
import NewReviewModal from '@/components/NewReviewModal.vue'
import AuthView from '@/views/AuthView.vue'
import { useAuth } from '@/composables/useAuth'
import { useRoute } from 'vue-router'

const { isLoggedIn, isReady } = useAuth()
const route = useRoute()
</script>

<template>
  <div class="container">
    <template v-if="route.path === '/auth/callback'">
      <RouterView />
    </template>
    <template v-else-if="!isReady" />
    <AuthView v-else-if="!isLoggedIn" />
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
  background: #0d0d0d;
  padding-bottom: 72px;
}

.container {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  background: #0d0d0d;
  position: relative;
}

@media (min-width: 680px) {
  body {
    background: #111111;
  }

  .container {
    box-shadow: 0 0 80px rgba(0, 0, 0, 0.5);
  }
}
</style>
