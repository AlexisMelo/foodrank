<script setup lang="ts">
import BottomTabBar from '@/components/BottomTabBar.vue'
import NewReviewModal from '@/components/NewReviewModal.vue'
import { useAuth } from '@/composables/useAuth'
import { useRoute } from 'vue-router'

const { isLoggedIn, isReady } = useAuth()
const route = useRoute()
</script>

<template>
  <div class="container">
    <template v-if="!isReady" />
    <!-- Login, sign up and reset password pages: shown without the app navigation -->
    <RouterView v-else-if="route.meta.access" />
    <!-- Private pages: a logged-out user is sent to the login page by the navigation guard -->
    <template v-else-if="isLoggedIn">
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
