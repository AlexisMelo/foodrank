<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Restaurant, CommunityVisit } from '@/types/restaurant'
import { fetchRestaurants, fetchCommunityVisitsByUserId } from '@/services/restaurantService'
import RecentReviewCard from '@/components/RecentReviewCard.vue'
import NewReviewChip from '@/components/NewReviewChip.vue'

const CURRENT_USER_ID = 'alex'

const recentVisits = ref<(CommunityVisit & { restaurant: Restaurant })[]>([])
const loading = ref(true)

onMounted(async () => {
  const [visits, restaurants] = await Promise.all([
    fetchCommunityVisitsByUserId(CURRENT_USER_ID),
    fetchRestaurants(),
  ])
  const restaurantMap = new Map(restaurants.map((r) => [r.id, r]))
  recentVisits.value = visits
    .slice(0, 5)
    .map((v) => ({ ...v, restaurant: restaurantMap.get(v.restaurantId)! }))
    .filter((v) => v.restaurant)
  loading.value = false
})
</script>

<template>
  <div class="home">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

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
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100vh;
  background-color: #0d0d0d;
  color: #ffffff;
  overflow: hidden;
  padding: 40px 20px;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
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
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
</style>
