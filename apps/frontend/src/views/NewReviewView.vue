<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant } from '@/types/restaurant'
import { fetchRestaurantById } from '@/services/restaurantService'

const route = useRoute()
const router = useRouter()
const restaurant = ref<Restaurant | null>(null)

onMounted(async () => {
  const found = await fetchRestaurantById(route.params.id as string)
  if (!found) { router.replace('/'); return }
  restaurant.value = found
})
</script>

<template>
  <div class="page">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

    <div class="header">
      <button class="back-btn" @click="router.back()">←</button>
    </div>

    <template v-if="restaurant">
      <div class="restaurant-hero">
        <div class="emoji-circle">{{ restaurant.emoji }}</div>
        <h2 class="restaurant-name">{{ restaurant.name }}</h2>
        <span class="restaurant-cuisine">{{ restaurant.cuisine }}</span>
      </div>

      <div class="placeholder-block">
        <span class="placeholder-icon">✍️</span>
        <p class="placeholder-title">Leave your review</p>
        <p class="placeholder-body">
          Rate your experience at {{ restaurant.name }}.<br/>
          This form is coming soon.
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  min-height: 100vh;
  background: #0d0d0d;
  color: #ffffff;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 160px;
  height: 160px;
  background: rgba(249, 199, 79, 0.07);
  top: -50px;
  right: -40px;
}
.blob-2 {
  width: 120px;
  height: 120px;
  background: rgba(199, 125, 255, 0.07);
  bottom: 25%;
  left: -30px;
}

.header {
  width: 100%;
  max-width: 420px;
  margin-bottom: 40px;
}

.back-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.restaurant-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}

.emoji-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
}

.restaurant-name {
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.4px;
  margin: 0;
  text-align: center;
}

.restaurant-cuisine {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.placeholder-block {
  width: 100%;
  max-width: 420px;
  background: #1a1a1a;
  border-radius: 20px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border: 1.5px dashed rgba(255, 255, 255, 0.1);
}

.placeholder-icon {
  font-size: 36px;
  margin-bottom: 4px;
}

.placeholder-title {
  font-size: 17px;
  font-weight: 800;
  margin: 0;
  color: #ffffff;
}

.placeholder-body {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  text-align: center;
  line-height: 1.6;
  margin: 0;
}
</style>
