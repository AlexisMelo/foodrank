<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit, User } from '@/types/restaurant'
import {
  fetchRestaurants,
  fetchUserById,
  fetchCommunityVisitsByUserId,
} from '@/services/restaurantService'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'
import PinnedTierlists from '@/components/PinnedTierlists.vue'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID } = useAuth()

const route = useRoute()
const router = useRouter()

const profileUserId = computed(() => (route.params.id as string) || CURRENT_USER_ID)
const isOwnProfile = computed(() => !route.params.id)

const displayUser = ref<User | null>(null)
const allRestaurants = ref<Restaurant[]>([])
const userVisits = ref<CommunityVisit[]>([])
const myVisits = ref<CommunityVisit[]>([])
const visitedCount = ref(0)
const loading = ref(true)

async function loadProfile(userId: string) {
  loading.value = true
  const viewingOther = userId !== CURRENT_USER_ID
  const [found, visits, restaurants, myVisitsRaw] = await Promise.all([
    fetchUserById(userId),
    fetchCommunityVisitsByUserId(userId),
    fetchRestaurants(),
    viewingOther ? fetchCommunityVisitsByUserId(CURRENT_USER_ID) : Promise.resolve([] as CommunityVisit[]),
  ])
  if (!found) {
    router.replace('/')
    return
  }
  displayUser.value = found
  allRestaurants.value = restaurants
  userVisits.value = visits
  myVisits.value = myVisitsRaw ?? []
  visitedCount.value = new Set(visits.map((v) => v.restaurantId)).size
  loading.value = false
}

onMounted(() => loadProfile(profileUserId.value))
watch(profileUserId, (newId) => loadProfile(newId))

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

function myScoreFor(restaurantId: string): number | undefined {
  const visits = myVisits.value.filter((v) => v.restaurantId === restaurantId)
  if (!visits.length) return undefined
  const food = visits.reduce((s, v) => s + v.food, 0) / visits.length
  const service = visits.reduce((s, v) => s + v.service, 0) / visits.length
  const decor = visits.reduce((s, v) => s + v.decor, 0) / visits.length
  return (food + service + decor) / 3
}

// Restaurants the user visited, ranked by their personal average (best = rank 1)
const displayedRestaurants = computed(() => {
  const visitedIds = new Set(userVisits.value.map((v) => v.restaurantId))
  return [...allRestaurants.value]
    .filter((r) => visitedIds.has(r.id))
    .map((r) => ({ ...r, scores: userCriteriaAvg(r.id), myScore: myScoreFor(r.id) }))
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
    <!-- Header -->
    <div class="header">
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

      <!-- Pinned tierlists -->
      <PinnedTierlists :userId="profileUserId" />

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
          :myScore="isOwnProfile ? undefined : restaurant.myScore"
          :rateLink="!isOwnProfile && restaurant.myScore === undefined ? `/review/${restaurant.id}` : undefined"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.profile {
  color: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Header */
.header {
  width: 100%;

  display: flex;
  align-items: center;
  margin-bottom: 32px;
  position: relative;
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

/* Pinned tierlists spacing */
:deep(.pinned-section) {
  margin-bottom: 24px;
}

.list {
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
