<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit, User } from '@/types/restaurant'
import {
  fetchRestaurants,
  fetchUserById,
  fetchCommunityVisitsByUserId,
} from '@/services/restaurantService'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'

const CURRENT_USER_ID = 'alex'

const route = useRoute()
const router = useRouter()

const profileUserId = computed(() => (route.params.id as string) || CURRENT_USER_ID)
const isOwnProfile = computed(() => !route.params.id)

const displayUser = ref<User | null>(null)
const allRestaurants = ref<Restaurant[]>([])
const userVisits = ref<CommunityVisit[]>([])
const visitedCount = ref(0)
const loading = ref(true)

onMounted(async () => {
  const [found, visits, restaurants] = await Promise.all([
    fetchUserById(profileUserId.value),
    fetchCommunityVisitsByUserId(profileUserId.value),
    fetchRestaurants(),
  ])
  if (!found) {
    router.replace('/')
    return
  }
  displayUser.value = found
  allRestaurants.value = restaurants
  userVisits.value = visits
  visitedCount.value = new Set(visits.map((v) => v.restaurantId)).size
  loading.value = false
})

// Per-criterion averages of the user's own visits for a restaurant
function userCriteriaAvg(restaurantId: string): {
  food: number
  service: number
  decor: number
  overall: number
} {
  const visits = userVisits.value.filter((v) => v.restaurantId === restaurantId)
  if (!visits.length) return { food: 0, service: 0, decor: 0, overall: 0 }
  const food = visits.reduce((s, v) => s + v.food, 0) / visits.length
  const service = visits.reduce((s, v) => s + v.service, 0) / visits.length
  const decor = visits.reduce((s, v) => s + v.decor, 0) / visits.length
  return { food, service, decor, overall: (food + service + decor) / 3 }
}

// Restaurants the user visited, ranked by their personal average (best = rank 1)
const displayedRestaurants = computed(() => {
  const visitedIds = new Set(userVisits.value.map((v) => v.restaurantId))
  return [...allRestaurants.value]
    .filter((r) => visitedIds.has(r.id))
    .map((r) => ({ ...r, scores: userCriteriaAvg(r.id) }))
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .map((r, i) => ({ ...r, rank: i + 1 }))
})

async function shareProfile() {
  await navigator.share({
    title: `${displayUser.value?.name}'s FoodRank profile`,
    url: window.location.href,
  })
}
</script>

<template>
  <div class="profile">
    <!-- Background blobs -->
    <div class="blob blob-1" />
    <div class="blob blob-2" />
    <div class="blob blob-3" />
    <div class="blob blob-4" />
    <div class="blob blob-5" />
    <div class="blob blob-6" />

    <!-- Header -->
    <div class="header">
      <button v-if="!isOwnProfile" class="back-btn" @click="router.back()">←</button>
      <button class="share-btn" @click="shareProfile">⬆</button>
    </div>

    <!-- Loading (other user fetch) -->
    <div v-if="loading" class="loading">👤</div>

    <template v-else-if="displayUser !== null">
      <!-- User profile -->
      <div class="winner-section">
        <div class="winner-avatar-wrap">
          <div class="winner-avatar">
            <span class="winner-emoji">{{ displayUser!.avatar }}</span>
          </div>
        </div>
        <h2 class="winner-name">{{ displayUser!.name }}</h2>
        <div class="winner-tag">{{ visitedCount }} ratings</div>
      </div>

      <!-- Ranked list -->
      <div class="list">
        <RankedRestaurantItem
          v-for="(restaurant, index) in displayedRestaurants"
          :key="restaurant.id"
          :restaurantId="restaurant.id"
          :emoji="restaurant.emoji"
          :name="restaurant.name"
          :cuisine="restaurant.cuisine"
          :food="restaurant.scores.food"
          :service="restaurant.scores.service"
          :decor="restaurant.scores.decor"
          :overall="restaurant.scores.overall"
          :index="index"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile {
  position: relative;
  background-color: #0d0d0d;
  color: #ffffff;
  overflow: hidden;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
}

/* Floating blobs */
.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 80px;
  height: 80px;
  background: rgba(168, 218, 220, 0.5);
  top: 8%;
  right: 6%;
}
.blob-2 {
  width: 40px;
  height: 40px;
  background: rgba(249, 199, 79, 0.6);
  top: 28%;
  left: 4%;
}
.blob-3 {
  width: 24px;
  height: 24px;
  background: rgba(144, 190, 109, 0.7);
  top: 14%;
  right: 30%;
}
.blob-4 {
  width: 56px;
  height: 56px;
  background: rgba(200, 100, 255, 0.35);
  top: 42%;
  right: 5%;
}
.blob-5 {
  width: 18px;
  height: 18px;
  background: rgba(255, 107, 107, 0.7);
  bottom: 30%;
  left: 8%;
}
.blob-6 {
  width: 36px;
  height: 36px;
  background: rgba(76, 201, 240, 0.5);
  bottom: 20%;
  right: 14%;
}

/* Header */
.header {
  width: 100%;
  max-width: 420px;
  display: flex;
  align-items: center;
  margin-bottom: 32px;
  position: relative;
}
.back-btn {
  position: absolute;
  left: 0;
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
  background: rgba(255, 255, 255, 0.1);
}
.share-btn {
  position: absolute;
  right: 0;
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
.share-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* Loading */
.loading {
  font-size: 48px;
  animation: pulse 1s ease-in-out infinite;
  margin-top: 40%;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.9);
  }
}

/* Winner section */
.winner-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}
.winner-avatar-wrap {
  position: relative;
  margin-bottom: 14px;
}
.winner-avatar {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f9c74f33, #c77dff33);
  border: 3px solid rgba(249, 199, 79, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52px;
}
.winner-name {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 10px;
  letter-spacing: -0.5px;
}
.winner-tag {
  display: block;
  padding: 6px 18px;
  border-radius: 100px;
  background: rgba(144, 190, 109, 0.25);
  color: #90be6d;
  border: 1.5px solid #90be6d;
  font-size: 14px;
  font-weight: 700;
}

/* List */
.list {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
