<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit } from '@/types/restaurant'
import {
  fetchRestaurantById,
  fetchCommunityVisitsByUserId,
  fetchRestaurants,
} from '@/services/restaurantService'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID } = useAuth()

const route = useRoute()
const router = useRouter()
const restaurant = ref<Restaurant | null>(null)
const allUserReviews = ref<(CommunityVisit & { restaurant: Restaurant })[]>([])

const food = ref(50)
const service = ref(50)
const scenery = ref(50)
const instantCrush = ref(false)

function sliderColor(value: number) {
  const pct = value / 100
  const r = pct < 0.5 ? 220 : Math.round(220 - (pct - 0.5) * 2 * 180)
  const g = pct < 0.5 ? Math.round(pct * 2 * 200) : Math.min(200, Math.round(100 + pct * 120))
  return `rgb(${r}, ${g}, 40)`
}

function sliderGradient(value: number) {
  const color = sliderColor(value)
  return `linear-gradient(to right, ${color} 0%, ${color} ${value}%, rgba(255,255,255,0.1) ${value}%, rgba(255,255,255,0.1) 100%)`
}

function ratingLabel(value: number) {
  const match = [...THRESHOLD_MARKERS].reverse().find((t) => value >= t.value)
  return match?.label ?? THRESHOLD_MARKERS[0]!.label
}

const foodGradient = computed(() => sliderGradient(food.value))
const serviceGradient = computed(() => sliderGradient(service.value))
const sceneryGradient = computed(() => sliderGradient(scenery.value))

// Position a marker on the slider track, accounting for the 22px thumb offset
function markerLeft(value: number) {
  return `calc(${value / 100} * (100% - 22px) + 11px)`
}

const THRESHOLD_MARKERS = [
  { value: 0, label: 'Awful' },
  { value: 10, label: 'Okay' },
  { value: 35, label: 'Good' },
  { value: 65, label: 'Great !' },
  { value: 90, label: 'Amazing !' },
]

const MARKER_TARGETS = [22, 50, 78]

function pickMarkers(key: 'food' | 'service' | 'decor') {
  const used = new Set<string>()
  return MARKER_TARGETS.map((target) => {
    const best = allUserReviews.value
      .filter((v) => !used.has(v.id) && Math.abs(v[key] - target) <= 10)
      .sort((a, b) => Math.abs(a[key] - target) - Math.abs(b[key] - target))[0]
    if (best) used.add(best.id)
    return best ?? null
  }).filter((v): v is NonNullable<typeof v> => v !== null)
}

const foodMarkers = computed(() => pickMarkers('food'))
const serviceMarkers = computed(() => pickMarkers('service'))
const decorMarkers = computed(() => pickMarkers('decor'))

onMounted(async () => {
  const [found, visits, restaurants] = await Promise.all([
    fetchRestaurantById(route.params.id as string),
    fetchCommunityVisitsByUserId(CURRENT_USER_ID),
    fetchRestaurants(),
  ])
  if (!found) {
    router.replace('/')
    return
  }
  restaurant.value = found
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]))
  allUserReviews.value = visits
    .map((v) => ({ ...v, restaurant: restaurantMap.get(v.restaurantId)! }))
    .filter((v) => v.restaurant)
})
</script>

<template>
  <div class="page">
    <div class="header">
      <button class="back-btn" @click="router.back()">←</button>
    </div>

    <template v-if="restaurant">
      <div class="restaurant-hero">
        <div class="emoji-circle">{{ restaurant.emoji }}</div>
        <h2 class="restaurant-name">{{ restaurant.name }}</h2>
      </div>

      <p class="section-label">Your verdict</p>

      <div class="criterion-card">
        <div class="criterion-header">
          <span class="criterion-icon">🍽️</span>
          <div class="criterion-labels">
            <span class="criterion-title">Food</span>
            <span class="criterion-label">Did the food blow your mind?</span>
          </div>
          <span
            class="rating-chip"
            :style="{
              backgroundColor: sliderColor(food) + '33',
              color: sliderColor(food),
              borderColor: sliderColor(food) + '66',
            }"
            >{{ ratingLabel(food) }}</span
          >
        </div>
        <div class="slider-wrap">
          <input
            type="range"
            min="0"
            max="100"
            v-model.number="food"
            class="slider"
            :style="{ background: foodGradient }"
          />
          <div class="markers-overlay">
            <div
              v-for="t in THRESHOLD_MARKERS.slice(1)"
              :key="t.label"
              class="marker threshold-marker"
              :style="{ left: markerLeft(t.value) }"
            >
              <div class="marker-bar" />
              <span class="marker-name">{{ t.label }}</span>
            </div>
            <div
              v-for="v in foodMarkers"
              :key="v.id"
              class="marker"
              :style="{ left: markerLeft(v.food), zIndex: v.food }"
            >
              <div class="marker-bar" />
              <span class="marker-emoji">{{ v.restaurant.emoji }}</span>
              <span class="marker-name">{{ v.restaurant.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="criterion-card">
        <div class="criterion-header">
          <span class="criterion-icon">🤝</span>
          <div class="criterion-labels">
            <span class="criterion-title">Service</span>
            <span class="criterion-label">How was the team treating you?</span>
          </div>
          <span
            class="rating-chip"
            :style="{
              backgroundColor: sliderColor(service) + '33',
              color: sliderColor(service),
              borderColor: sliderColor(service) + '66',
            }"
            >{{ ratingLabel(service) }}</span
          >
        </div>
        <div class="slider-wrap">
          <input
            type="range"
            min="0"
            max="100"
            v-model.number="service"
            class="slider"
            :style="{ background: serviceGradient }"
          />
          <div class="markers-overlay">
            <div
              v-for="t in THRESHOLD_MARKERS.slice(1)"
              :key="t.label"
              class="marker threshold-marker"
              :style="{ left: markerLeft(t.value) }"
            >
              <div class="marker-bar" />
              <span class="marker-name">{{ t.label }}</span>
            </div>
            <div
              v-for="v in serviceMarkers"
              :key="v.id"
              class="marker"
              :style="{ left: markerLeft(v.service), zIndex: v.service }"
            >
              <div class="marker-bar" />
              <span class="marker-emoji">{{ v.restaurant.emoji }}</span>
              <span class="marker-name">{{ v.restaurant.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="criterion-card">
        <div class="criterion-header">
          <span class="criterion-icon">✨</span>
          <div class="criterion-labels">
            <span class="criterion-title">Decor</span>
            <span class="criterion-label">Would you Instagram this place?</span>
          </div>
          <span
            class="rating-chip"
            :style="{
              backgroundColor: sliderColor(scenery) + '33',
              color: sliderColor(scenery),
              borderColor: sliderColor(scenery) + '66',
            }"
            >{{ ratingLabel(scenery) }}</span
          >
        </div>
        <div class="slider-wrap">
          <input
            type="range"
            min="0"
            max="100"
            v-model.number="scenery"
            class="slider"
            :style="{ background: sceneryGradient }"
          />
          <div class="markers-overlay">
            <div
              v-for="t in THRESHOLD_MARKERS.slice(1)"
              :key="t.label"
              class="marker threshold-marker"
              :style="{ left: markerLeft(t.value) }"
            >
              <div class="marker-bar" />
              <span class="marker-name">{{ t.label }}</span>
            </div>
            <div
              v-for="v in decorMarkers"
              :key="v.id"
              class="marker"
              :style="{ left: markerLeft(v.decor), zIndex: v.decor }"
            >
              <div class="marker-bar" />
              <span class="marker-emoji">{{ v.restaurant.emoji }}</span>
              <span class="marker-name">{{ v.restaurant.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="actions-card">
        <button
          class="crush-toggle"
          :class="{ 'crush-on': instantCrush }"
          @click="instantCrush = !instantCrush"
        >
          <span class="crush-heart">{{ instantCrush ? '❤️' : '🤍' }}</span>
          <div class="crush-text">
            <span class="crush-title">Instant Crush</span>
            <span class="crush-sub">This place stole your heart !</span>
          </div>
          <div class="crush-pip" :class="{ 'crush-pip-on': instantCrush }" />
        </button>

        <button class="submit-btn" @click="router.push(`/restaurant/${route.params.id}`)">
          Lock it in
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  background: #0d0d0d;
  color: #ffffff;
  padding: 24px 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
  overflow: hidden;
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
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 16px;
}

.emoji-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 2px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.restaurant-name {
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -0.3px;
  margin: 0;
}

.section-label {
  width: 100%;
  max-width: 420px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin: 0 0 8px;
}

.criterion-card {
  width: 100%;
  max-width: 420px;
  background: #1a1a1a;
  border-radius: 20px;
  padding: 20px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  margin-bottom: 10px;
}

.actions-card {
  width: 100%;
  max-width: 420px;
  background: #1a1a1a;
  border-radius: 20px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  margin-top: 4px;
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

.criterion-labels {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.criterion-title {
  font-size: 15px;
  font-weight: 800;
  color: #ffffff;
  line-height: 1;
}

.rating-chip {
  margin-left: auto;
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1.5px solid;
  font-size: 11px;
  font-weight: 800;
  transition:
    background-color 0.2s,
    color 0.2s,
    border-color 0.2s;
}

.criterion-label {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.3;
}

/* Slider with markers */
.slider-wrap {
  position: relative;
  padding-bottom: 42px;
}

.markers-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 42px;
  pointer-events: none;
}

.marker {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.marker-bar {
  width: 2px;
  height: 15px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 1px;
  flex-shrink: 0;
}

.threshold-marker {
  z-index: 0;
}
.threshold-marker .marker-bar {
  width: 1px;
  height: 7px;
  background: rgba(255, 255, 255, 0.1);
}
.threshold-marker .marker-name {
  color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

.marker-emoji {
  font-size: 10px;
  line-height: 1;
  opacity: 0.65;
}

.marker-name {
  font-size: 8px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  white-space: nowrap;
  line-height: 1;
  background: #1a1a1a;
  padding: 0 2px;
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

/* Instant Crush */
.crush-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.2s,
    background 0.2s;
}
.crush-toggle.crush-on {
  border-color: rgba(255, 100, 130, 0.5);
  background: rgba(255, 80, 110, 0.08);
}

.crush-heart {
  font-size: 26px;
  flex-shrink: 0;
  transition: transform 0.2s;
}
.crush-toggle.crush-on .crush-heart {
  transform: scale(1.15);
}

.crush-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.crush-title {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
}
.crush-sub {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
}

.crush-pip {
  width: 36px;
  height: 20px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s;
}
.crush-pip::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transition:
    transform 0.2s,
    background 0.2s;
}
.crush-pip.crush-pip-on {
  background: #ff4d6d;
}
.crush-pip.crush-pip-on::after {
  transform: translateX(16px);
  background: #ffffff;
}

/* Submit */
.submit-btn {
  width: 100%;
  padding: 18px 20px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #f9c74f, #f4845f);
  color: #0d0d0d;
  font-size: 16px;
  font-weight: 900;
  font-family: inherit;
  cursor: pointer;
  letter-spacing: -0.2px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition:
    opacity 0.2s,
    transform 0.15s;
}
.submit-btn svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
.submit-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}
.submit-btn:active {
  transform: translateY(0);
}
</style>
