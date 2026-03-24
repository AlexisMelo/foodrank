<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit } from '@/types/restaurant'
import { fetchRestaurantById, fetchCommunityVisitsByUserId, fetchRestaurants } from '@/services/restaurantService'

const CURRENT_USER_ID = 'alex'

const route = useRoute()
const router = useRouter()
const restaurant = ref<Restaurant | null>(null)
const recentReviews = ref<(CommunityVisit & { restaurant: Restaurant })[]>([])

const food = ref(50)
const service = ref(50)
const scenery = ref(50)

function sliderGradient(value: number) {
  const pct = value / 100
  // red at 0, yellow at ~50, green at 90+
  const r = pct < 0.5 ? 220 : Math.round(220 - (pct - 0.5) * 2 * 180)
  const g = pct < 0.5 ? Math.round(pct * 2 * 200) : Math.min(200, Math.round(100 + pct * 120))
  const color = `rgb(${r}, ${g}, 40)`
  return `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)`
}

const foodGradient = computed(() => sliderGradient(food.value))
const serviceGradient = computed(() => sliderGradient(service.value))
const sceneryGradient = computed(() => sliderGradient(scenery.value))

function scoreColor(score: number) {
  if (score >= 85) return '#90be6d'
  if (score >= 65) return '#f9c74f'
  return '#ff6b6b'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

onMounted(async () => {
  const [found, visits, restaurants] = await Promise.all([
    fetchRestaurantById(route.params.id as string),
    fetchCommunityVisitsByUserId(CURRENT_USER_ID),
    fetchRestaurants(),
  ])
  if (!found) { router.replace('/'); return }
  restaurant.value = found
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]))
  recentReviews.value = visits
    .slice(0, 3)
    .map((v) => ({ ...v, restaurant: restaurantMap.get(v.restaurantId)! }))
    .filter((v) => v.restaurant)
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

      <div v-if="recentReviews.length" class="past-section">
        <p class="past-label">Your last visits</p>
        <div class="past-row">
          <div v-for="v in recentReviews" :key="v.id" class="mini-card">
            <div class="mini-emoji-wrap">
              <div class="mini-emoji">{{ v.restaurant.emoji }}</div>
              <div class="mini-bubble" :style="{ backgroundColor: scoreColor(Math.round((v.food + v.service + v.decor) / 3)) }">
                {{ Math.round((v.food + v.service + v.decor) / 3) }}
              </div>
            </div>
            <span class="mini-name">{{ v.restaurant.name }}</span>
            <span class="mini-date">{{ formatDate(v.date) }}</span>
          </div>
        </div>
      </div>

      <div class="review-card">
        <p class="card-title">Your verdict</p>

        <div class="criterion">
          <div class="criterion-header">
            <span class="criterion-icon">🍽️</span>
            <span class="criterion-label">Did the food blow your mind?</span>
          </div>
          <input
            type="range" min="0" max="100" v-model.number="food"
            class="slider"
            :style="{ background: foodGradient }"
          />
        </div>

        <div class="criterion">
          <div class="criterion-header">
            <span class="criterion-icon">🤝</span>
            <span class="criterion-label">How was the team treating you?</span>
          </div>
          <input
            type="range" min="0" max="100" v-model.number="service"
            class="slider"
            :style="{ background: serviceGradient }"
          />
        </div>

        <div class="criterion">
          <div class="criterion-header">
            <span class="criterion-icon">✨</span>
            <span class="criterion-label">Would you Instagram this place?</span>
          </div>
          <input
            type="range" min="0" max="100" v-model.number="scenery"
            class="slider"
            :style="{ background: sceneryGradient }"
          />
        </div>

        <button class="submit-btn" @click="router.push(`/restaurant/${route.params.id}`)">Submit review</button>
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
  margin-bottom: 16px;
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
  gap: 6px;
  margin-bottom: 20px;
}

.emoji-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
}

.restaurant-name {
  font-size: 18px;
  font-weight: 900;
  letter-spacing: -0.3px;
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

/* Past reviews */
.past-section {
  width: 100%;
  max-width: 420px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.past-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0;
}

.past-row {
  display: flex;
  gap: 10px;
}

.mini-card {
  flex: 1;
  background: #1a1a1a;
  border-radius: 16px;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  border: 1.5px solid rgba(255, 255, 255, 0.06);
}

.mini-emoji-wrap {
  position: relative;
  flex-shrink: 0;
}

.mini-emoji {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.mini-bubble {
  position: absolute;
  bottom: -2px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 900;
  color: #0d0d0d;
  border: 2px solid #0d0d0d;
}

.mini-name {
  font-size: 11px;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  line-height: 1.3;
  width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.mini-date {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
}

/* Review card */
.review-card {
  width: 100%;
  max-width: 420px;
  background: #1a1a1a;
  border-radius: 24px;
  padding: 28px 24px 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
}

.card-title {
  font-size: 18px;
  font-weight: 900;
  margin: 0;
  letter-spacing: -0.3px;
}

.criterion {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.criterion-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.criterion-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.criterion-label {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.3;
}

/* Slider */
.slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  border-radius: 999px;
  outline: none;
  cursor: pointer;
  transition: background 0.15s;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 0.15s;
}

.slider::-webkit-slider-thumb:active {
  transform: scale(1.2);
}

.slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

/* Submit */
.submit-btn {
  margin-top: 4px;
  width: 100%;
  padding: 16px;
  border-radius: 999px;
  border: none;
  background: #f9c74f;
  color: #0d0d0d;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
  letter-spacing: 0.2px;
  transition: opacity 0.2s, transform 0.15s;
}
.submit-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.submit-btn:active {
  transform: translateY(0);
}
</style>
