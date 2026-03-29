<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit, Tierlist } from '@/types/restaurant'
import { fetchTierlistById, fetchRestaurants, fetchCommunityVisitsByUserId } from '@/services/restaurantService'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'

const CURRENT_USER_ID = 'alex'

const route = useRoute()
const router = useRouter()

const tierlist = ref<Tierlist | null>(null)
const restaurants = ref<Restaurant[]>([])
const userVisits = ref<CommunityVisit[]>([])
const loading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  const [found, allRestaurants, visits] = await Promise.all([
    fetchTierlistById(id),
    fetchRestaurants(),
    fetchCommunityVisitsByUserId(CURRENT_USER_ID),
  ])
  if (!found) {
    router.replace('/tierlists')
    return
  }
  tierlist.value = found
  const tierlistIds = new Set(found.restaurants.map((e) => e.restaurantId))
  const restaurantMap = new Map(allRestaurants.map((r) => [r.id, r]))
  restaurants.value = found.restaurants
    .map((e) => restaurantMap.get(e.restaurantId)!)
    .filter(Boolean)
  userVisits.value = visits.filter((v) => tierlistIds.has(v.restaurantId))
  loading.value = false
})

function scoreForRestaurant(restaurantId: string) {
  const visits = userVisits.value.filter((v) => v.restaurantId === restaurantId)
  if (!visits.length) return { food: 0, service: 0, decor: 0, overall: 0 }
  const food = visits.reduce((s, v) => s + v.food, 0) / visits.length
  const service = visits.reduce((s, v) => s + v.service, 0) / visits.length
  const decor = visits.reduce((s, v) => s + v.decor, 0) / visits.length
  return { food, service, decor, overall: (food + service + decor) / 3 }
}

const rankedRestaurants = computed(() =>
  restaurants.value
    .map((r) => ({ ...r, scores: scoreForRestaurant(r.id) }))
    .sort((a, b) => b.scores.overall - a.scores.overall),
)

function formattedDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}
</script>

<template>
  <div class="detail-view">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

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
        <div class="meta-row">
          <span class="meta-chip">{{ restaurants.length }} restaurants</span>
          <span class="meta-sep">·</span>
          <span class="meta-date">{{ formattedDate(tierlist.createdAt) }}</span>
        </div>
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

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 320px;
  height: 320px;
  background: rgba(255, 200, 60, 0.07);
  top: -100px;
  left: -60px;
}

.blob-2 {
  width: 200px;
  height: 200px;
  background: rgba(100, 100, 255, 0.06);
  bottom: 300px;
  right: -60px;
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

.meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}

.meta-chip {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 100px;
}

.meta-sep {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.2);
}

.meta-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.35);
}

.restaurant-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
