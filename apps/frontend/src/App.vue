<script setup lang="ts">
import BottomTabBar from '@/components/BottomTabBar.vue'
import NewReviewModal from '@/components/NewReviewModal.vue'
</script>

<template>
  <div class="container">
    <RouterView />
    <BottomTabBar />
    <NewReviewModal />
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
