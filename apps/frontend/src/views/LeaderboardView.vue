<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit, User } from '@/types/restaurant'
import {
  fetchRestaurants,
  fetchUserById,
  fetchCommunityVisitsByUserId,
  fetchAllCommunityVisits,
} from '@/services/restaurantService'

const CURRENT_USER_ID = 'alex'

const route = useRoute()
const router = useRouter()

const profileUserId = computed(() => (route.params.id as string) || CURRENT_USER_ID)
const isOwnProfile = computed(() => !route.params.id)

const displayUser = ref<User | null>(null)
const allRestaurants = ref<Restaurant[]>([])
const allCommunityVisits = ref<CommunityVisit[]>([])
const userVisitedIds = ref<Set<string>>(new Set())
const visitedCount = ref(0)
const loading = ref(true)
const sortAsc = ref(true)

onMounted(async () => {
  const [found, userVisits, restaurants, communityVisits] = await Promise.all([
    fetchUserById(profileUserId.value),
    fetchCommunityVisitsByUserId(profileUserId.value),
    fetchRestaurants(),
    fetchAllCommunityVisits(),
  ])
  if (!found) {
    router.replace('/')
    return
  }
  displayUser.value = found
  allRestaurants.value = restaurants
  allCommunityVisits.value = communityVisits
  const ratedIds = new Set(userVisits.map((v) => v.restaurantId))
  userVisitedIds.value = ratedIds
  visitedCount.value = ratedIds.size
  loading.value = false
})

// Average score across all users for a given restaurant
function globalAvg(restaurantId: string): number {
  const visits = allCommunityVisits.value.filter((v) => v.restaurantId === restaurantId)
  if (!visits.length) return 0
  return visits.reduce((s, v) => s + (v.food + v.service + v.decor) / 3, 0) / visits.length
}

// All restaurants ranked globally by average rating, filtered to user's visited ones
const rankedRestaurants = computed(() => {
  const sorted = [...allRestaurants.value].sort((a, b) => globalAvg(b.id) - globalAvg(a.id))
  return sorted
    .map((r, i) => ({ ...r, rank: i + 1 }))
    .filter((r) => userVisitedIds.value.has(r.id))
})

const displayedRestaurants = computed(() =>
  sortAsc.value ? rankedRestaurants.value : [...rankedRestaurants.value].reverse(),
)

const rankColors = ['#f9c74f', '#a8dadc', '#f4a261', '#90be6d', '#c77dff', '#4cc9f0', '#ff6b6b']

async function shareProfile() {
  await navigator.share({ title: `${displayUser.value?.name}'s FoodRank profile`, url: window.location.href })
}
</script>

<template>
  <div class="leaderboard">
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
      <h1 class="title">Leaderboard 🏆</h1>
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
        <RouterLink
          v-for="(restaurant, index) in displayedRestaurants"
          :key="restaurant.rank"
          :to="`/restaurant/${restaurant.id}`"
          class="list-item"
          :class="{ 'list-item-first': index === 0 }"
        >
          <div class="item-avatar">
            <span class="item-emoji">{{ restaurant.emoji }}</span>
          </div>
          <div class="item-info">
            <span class="item-name">{{ restaurant.name }}</span>
            <span class="item-sub">{{ restaurant.cuisine }} · {{ restaurant.score }}% score</span>
          </div>
          <div class="item-rank" :style="{ backgroundColor: rankColors[index] }">
            {{ restaurant.rank }}
          </div>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.leaderboard {
  position: relative;
  min-height: 100vh;
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
.title {
  flex: 1;
  text-align: center;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.3px;
  margin: 0;
}

/* Loading */
.loading {
  font-size: 48px;
  animation: pulse 1s ease-in-out infinite;
  margin-top: 40%;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.9); }
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
.list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 16px;
  background: #1a1a1a;
  text-decoration: none;
  color: inherit;
}
.list-item-first {
  background: #ffffff;
  color: #0d0d0d;
}
.list-item-first .item-name {
  color: #0d0d0d;
}
.list-item-first .item-sub {
  color: #555;
}
.item-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.list-item-first .item-avatar {
  background: rgba(0, 0, 0, 0.06);
}
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.item-name {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}
.item-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}
.item-rank {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 13px;
  color: #0d0d0d;
  flex-shrink: 0;
}
</style>
