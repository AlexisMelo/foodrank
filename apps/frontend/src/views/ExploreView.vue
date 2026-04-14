<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Restaurant } from '@/types/restaurant'
import { fetchRestaurants, fetchCommunityVisitsByUserId } from '@/services/restaurantService'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID } = useAuth()
const router = useRouter()

interface RestaurantWithDistance extends Restaurant {
  distance: number | null
}

const nearbyUnvisited = ref<RestaurantWithDistance[]>([])
const loading = ref(true)
const locationDenied = ref(false)

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

onMounted(async () => {
  const [restaurants, visits] = await Promise.all([
    fetchRestaurants(),
    fetchCommunityVisitsByUserId(CURRENT_USER_ID),
  ])

  const visitedIds = new Set(visits.map((v) => v.restaurantId))
  const unvisited = restaurants.filter((r) => !visitedIds.has(r.id))

  let userLat: number | null = null
  let userLng: number | null = null

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
    )
    userLat = pos.coords.latitude
    userLng = pos.coords.longitude
  } catch {
    locationDenied.value = true
  }

  const withDistance: RestaurantWithDistance[] = unvisited.map((r) => ({
    ...r,
    distance:
      userLat !== null && userLng !== null ? haversineKm(userLat, userLng, r.lat, r.lng) : null,
  }))

  if (userLat !== null) {
    withDistance.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
  }

  nearbyUnvisited.value = withDistance.slice(0, 5)
  loading.value = false
})
</script>

<template>
  <div class="explore">
    <div class="page-header">
      <h1 class="page-title">Explore</h1>
      <p class="page-subtitle">Places you haven't tried yet</p>
    </div>

    <div v-if="loading" class="loading">🍽️</div>

    <template v-else>
      <div v-if="locationDenied" class="location-notice">
        📍 Enable location to sort by distance
      </div>

      <div class="cards-scroll">
        <div
          v-for="restaurant in nearbyUnvisited"
          :key="restaurant.id"
          class="restaurant-card"
          @click="router.push(`/restaurant/${restaurant.id}`)"
        >
          <div class="card-emoji">{{ restaurant.emoji }}</div>
          <div class="card-name">{{ restaurant.name }}</div>
          <div v-if="restaurant.distance !== null" class="card-distance">
            📍 {{ formatDistance(restaurant.distance) }}
          </div>
          <div v-else class="card-distance muted">{{ restaurant.cuisine }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.explore {
  position: relative;
  background-color: #0d0d0d;
  color: #ffffff;
  min-height: 100dvh;
  overflow: hidden;
  padding: 24px 20px 100px;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
}

.page-header {
  margin-bottom: 28px;
}
.page-title {
  font-size: 30px;
  font-weight: 800;
  margin: 0 0 4px;
  letter-spacing: -0.5px;
}
.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.loading {
  font-size: 48px;
  text-align: center;
  margin-top: 40%;
  animation: pulse 1s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
}

.location-notice {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 16px;
}

.cards-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}
.cards-scroll::-webkit-scrollbar {
  display: none;
}

.restaurant-card {
  flex-shrink: 0;
  width: 140px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 20px 14px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}
.restaurant-card:active {
  transform: scale(0.97);
  background: rgba(255, 255, 255, 0.09);
}

.card-emoji {
  font-size: 40px;
  line-height: 1;
}
.card-name {
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  line-height: 1.3;
}
.card-distance {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 600;
}
.card-distance.muted {
  color: rgba(255, 255, 255, 0.3);
}
</style>
