<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit, User } from '@/types/restaurant'
import {
  fetchRestaurants,
  fetchCommunityVisitsByUserId,
  fetchUserById,
  fetchTierlistsByUserId,
} from '@/services/restaurantService'
import RecentReviewCard from '@/components/RecentReviewCard.vue'
import NewReviewChip from '@/components/NewReviewChip.vue'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'
import TierlistChip from '@/components/TierlistChip.vue'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID } = useAuth()
const router = useRouter()

const currentUser = ref<User | null>(null)
const visitedCount = ref(0)
const recentVisits = ref<(CommunityVisit & { restaurant: Restaurant })[]>([])
const allRestaurants = ref<Restaurant[]>([])
const allVisits = ref<CommunityVisit[]>([])
const recentTierlists = ref<{ id: string; name: string; emoji: string }[]>([])
const loading = ref(true)

onMounted(async () => {
  const [user, visits, restaurants, tierlists] = await Promise.all([
    fetchUserById(CURRENT_USER_ID),
    fetchCommunityVisitsByUserId(CURRENT_USER_ID),
    fetchRestaurants(),
    fetchTierlistsByUserId(CURRENT_USER_ID),
  ])
  currentUser.value = user ?? null
  allVisits.value = visits
  allRestaurants.value = restaurants
  visitedCount.value = new Set(visits.map((v) => v.restaurantId)).size
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]))
  recentVisits.value = visits
    .slice(0, 5)
    .map((v) => ({ ...v, restaurant: restaurantMap.get(v.restaurantId)! }))
    .filter((v) => v.restaurant)
  recentTierlists.value = [...tierlists]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8)
    .map((t) => ({ id: t.id, name: t.name, emoji: t.emoji }))
  loading.value = false
})

const topRestaurants = computed(() => {
  const visitedIds = new Set(allVisits.value.map((v) => v.restaurantId))
  return [...allRestaurants.value]
    .filter((r) => visitedIds.has(r.id))
    .map((r) => {
      const visits = allVisits.value.filter((v) => v.restaurantId === r.id)
      const food = visits.reduce((s, v) => s + v.food, 0) / visits.length
      const service = visits.reduce((s, v) => s + v.service, 0) / visits.length
      const decor = visits.reduce((s, v) => s + v.decor, 0) / visits.length
      return { ...r, scores: { food, service, decor, overall: (food + service + decor) / 3 } }
    })
    .sort((a, b) => b.scores.overall - a.scores.overall)
    .slice(0, 3)
})
</script>

<template>
  <div class="home">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

    <button v-if="currentUser" class="user-bar" @click="router.push('/profile')">
      <span class="user-avatar">{{ currentUser.avatar }}</span>
      <span class="user-name">{{ currentUser.name }}</span>
      <span class="user-visited">{{ visitedCount }} restaurants</span>
    </button>

    <section class="section">
      <div class="section-header">
        <h2 class="section-title">Recent reviews</h2>
        <NewReviewChip />
      </div>
      <div class="cards-row">
        <div v-if="loading" v-for="i in 5" :key="i" class="card-skeleton" />

        <RecentReviewCard
          v-else
          v-for="visit in recentVisits"
          :key="visit.id"
          :restaurantId="visit.restaurantId"
          :emoji="visit.restaurant.emoji"
          :name="visit.restaurant.name"
          :date="visit.date"
          :food="visit.food"
          :service="visit.service"
          :decor="visit.decor"
        />
      </div>
    </section>

    <section v-if="recentTierlists.length" class="section">
      <div class="section-header">
        <h2 class="section-title">Tierlists</h2>
        <RouterLink to="/tierlists" class="see-all-chip">See all</RouterLink>
      </div>
      <div class="cards-row">
        <TierlistChip
          v-for="t in recentTierlists"
          :key="t.id"
          :id="t.id"
          :name="t.name"
          :emoji="t.emoji"
        />
      </div>
    </section>

    <section v-if="topRestaurants.length" class="section">
      <div class="section-header">
        <h2 class="section-title">Favorites</h2>
        <RouterLink to="/profile" class="see-all-chip">See all</RouterLink>
      </div>
      <div class="favorites-list">
        <RankedRestaurantItem
          v-for="(r, index) in topRestaurants"
          :key="r.id"
          :restaurantId="r.id"
          :emoji="r.emoji"
          :name="r.name"
          :cuisine="r.cuisine"
          :food="r.scores.food"
          :service="r.scores.service"
          :decor="r.scores.decor"
          :overall="r.scores.overall"
          :index="index"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  position: relative;
  background-color: #0d0d0d;
  color: #ffffff;
  overflow: hidden;
  padding: 40px 20px;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 200px;
  height: 200px;
  background: rgba(199, 125, 255, 0.08);
  top: -60px;
  right: -60px;
}
.blob-2 {
  width: 140px;
  height: 140px;
  background: rgba(76, 201, 240, 0.07);
  bottom: 20%;
  left: -40px;
}

.user-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: #1a1a1a;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 10px 14px;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s;
}
.user-bar:hover {
  background: #222;
}

.user-avatar {
  font-size: 24px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  flex: 1;
}

.user-visited {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}

.section {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.section-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  color: #ffffff;
  margin: 0;
}

.cards-row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.cards-row::-webkit-scrollbar {
  display: none;
}

.see-all-chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 100px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition:
    border-color 0.2s,
    color 0.2s;
}
.see-all-chip:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.8);
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Skeleton */
.card-skeleton {
  flex-shrink: 0;
  width: 148px;
  height: 190px;
  background: #1a1a1a;
  border-radius: 20px;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
