<script setup lang="ts">
import BottomTabBar from '@/components/BottomTabBar.vue'
import NewReviewModal from '@/components/NewReviewModal.vue'
import AuthView from '@/views/AuthView.vue'
import { useAuth } from '@/composables/useAuth'

const { isLoggedIn, isReady } = useAuth()
</script>

<template>
  <div class="container">
    <template v-if="!isReady" />
    <AuthView v-else-if="!isLoggedIn" />
    <template v-else>
      <RouterView />
      <BottomTabBar />
      <NewReviewModal />
    </template>
  </div>
</template>

<style lang="scss">
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
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
  padding: 20px;
}
</style>
