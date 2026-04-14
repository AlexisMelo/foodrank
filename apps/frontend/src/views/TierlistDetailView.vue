<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit, Tierlist, User } from '@/types/restaurant'
import { fetchTierlistById, fetchRestaurants, fetchCommunityVisitsByUserId, fetchUserById } from '@/services/restaurantService'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID } = useAuth()

const route = useRoute()
const router = useRouter()

const tierlist = ref<Tierlist | null>(null)
const owner = ref<User | null>(null)
const restaurants = ref<Restaurant[]>([])
const ownerVisits = ref<CommunityVisit[]>([])
const myVisits = ref<CommunityVisit[]>([])
const isPinned = ref(false)
const loading = ref(true)

const isOwner = computed(() => tierlist.value?.userId === CURRENT_USER_ID)

onMounted(async () => {
  const id = route.params.id as string
  const found = await fetchTierlistById(id)
  if (!found) {
    router.replace('/tierlists')
    return
  }
  tierlist.value = found
  isPinned.value = found.pinned

  const isViewerOwner = found.userId === CURRENT_USER_ID
  const tierlistIds = new Set(found.restaurants.map((e) => e.restaurantId))
  const fetches: Promise<unknown>[] = [
    fetchRestaurants(),
    fetchCommunityVisitsByUserId(found.userId),
    fetchUserById(found.userId),
  ]
  if (!isViewerOwner) fetches.push(fetchCommunityVisitsByUserId(CURRENT_USER_ID))

  const [allRestaurants, visits, foundOwner, myVisitsRaw] = await Promise.all(fetches) as [
    Restaurant[], CommunityVisit[], User | undefined, CommunityVisit[] | undefined
  ]
  const restaurantMap = new Map(allRestaurants.map((r) => [r.id, r]))
  restaurants.value = found.restaurants
    .map((e) => restaurantMap.get(e.restaurantId)!)
    .filter(Boolean)
  ownerVisits.value = visits.filter((v) => tierlistIds.has(v.restaurantId))
  myVisits.value = (myVisitsRaw ?? []).filter((v) => tierlistIds.has(v.restaurantId))
  owner.value = foundOwner ?? null
  loading.value = false
})

function overallAvg(visits: CommunityVisit[]): number {
  const food = visits.reduce((s, v) => s + v.food, 0) / visits.length
  const service = visits.reduce((s, v) => s + v.service, 0) / visits.length
  const decor = visits.reduce((s, v) => s + v.decor, 0) / visits.length
  return (food + service + decor) / 3
}

function scoreForRestaurant(restaurantId: string) {
  const visits = ownerVisits.value.filter((v) => v.restaurantId === restaurantId)
  if (!visits.length) return { food: 0, service: 0, decor: 0, overall: 0 }
  const food = visits.reduce((s, v) => s + v.food, 0) / visits.length
  const service = visits.reduce((s, v) => s + v.service, 0) / visits.length
  const decor = visits.reduce((s, v) => s + v.decor, 0) / visits.length
  return { food, service, decor, overall: (food + service + decor) / 3 }
}

function myScoreForRestaurant(restaurantId: string): number | undefined {
  if (isOwner.value) return undefined
  const visits = myVisits.value.filter((v) => v.restaurantId === restaurantId)
  return visits.length ? overallAvg(visits) : undefined
}

const rankedRestaurants = computed(() =>
  restaurants.value
    .map((r) => ({ ...r, scores: scoreForRestaurant(r.id), myScore: myScoreForRestaurant(r.id) }))
    .sort((a, b) => b.scores.overall - a.scores.overall),
)


</script>

<template>
  <div class="detail-view">
    <div class="top-bar">
      <button class="back-btn" @click="router.back()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
    </div>

    <div v-if="loading" class="loading">⏳</div>

    <template v-else-if="tierlist">
      <div class="hero">
        <div class="cover">{{ tierlist.emoji }}</div>
        <h1 class="title">{{ tierlist.name }}</h1>
        <p class="description">{{ tierlist.description }}</p>

        <button v-if="isOwner" class="pin-btn" :class="{ pinned: isPinned }" @click="isPinned = !isPinned">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="17" x2="12" y2="22"/>
            <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
          </svg>
          {{ isPinned ? 'Pinned to profile' : 'Pin to profile' }}
        </button>
      </div>

      <div class="list-header">
        <RouterLink v-if="owner" :to="`/user/${owner.id}`" class="owner">
          <span class="owner-avatar">{{ owner.avatar }}</span>
          <span class="owner-name">{{ owner.name }}</span>
        </RouterLink>
        <span class="meta-chip">{{ restaurants.length }} restaurants</span>
      </div>

      <div class="restaurant-list">
        <RankedRestaurantItem
          v-for="(r, index) in rankedRestaurants"
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
          :myScore="r.myScore"
        />
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail-view {
  min-height: 100dvh;
  background: #0d0d0d;
  color: #ffffff;
  padding: 0 20px 100px;
  position: relative;
  overflow: hidden;
  max-width: 420px;
  margin: 0 auto;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
}

.top-bar {
  position: relative;
  z-index: 1;
  padding-top: 52px;
  margin-bottom: 8px;
}

.back-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.back-btn:active {
  background: rgba(255, 255, 255, 0.12);
}

.back-btn svg {
  width: 18px;
  height: 18px;
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

.hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 0 32px;
  gap: 12px;
}

.cover {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  margin-bottom: 4px;
}

.title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 0;
}

.description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.5;
  max-width: 300px;
}

.list-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.owner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
}

.owner-avatar {
  font-size: 14px;
}

.owner-name {
  font-size: 13px;
  font-weight: 600;
}

.meta-chip {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 100px;
}

.pin-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}

.pin-btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.pin-btn.pinned {
  background: #ffffff;
  border-color: #ffffff;
  color: #0d0d0d;
}

.restaurant-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
