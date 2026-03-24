<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant, CommunityVisit } from '@/types/restaurant'
import { fetchRestaurantById, fetchCommunityVisitsByRestaurantId } from '@/services/restaurantService'
import RatingScores from '@/components/RatingScores.vue'
import NewReviewChip from '@/components/NewReviewChip.vue'

const CURRENT_USER_ID = 'alex'

const route = useRoute()
const router = useRouter()
const restaurant = ref<Restaurant | null>(null)
const allVisits = ref<CommunityVisit[]>([])
const loading = ref(true)
const activeTab = ref<'mine' | 'community'>('mine')

onMounted(async () => {
  const id = route.params.id as string
  const [found, visits] = await Promise.all([
    fetchRestaurantById(id),
    fetchCommunityVisitsByRestaurantId(id),
  ])
  if (!found) {
    router.replace('/')
    return
  }
  restaurant.value = found
  allVisits.value = visits
  loading.value = false
})

function visitAvg(visit: CommunityVisit): number {
  return Math.round((visit.food + visit.service + visit.decor) / 3)
}

const myVisits = computed(() => allVisits.value.filter((v) => v.user.id === CURRENT_USER_ID))

const recentVisits = computed(() =>
  allVisits.value.filter((v) => v.user.id !== CURRENT_USER_ID).slice(0, 5),
)

const overallAvg = computed(() => {
  if (!allVisits.value.length) return null
  const total = allVisits.value.reduce((sum, v) => sum + visitAvg(v), 0)
  return Math.round(total / allVisits.value.length)
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function scoreColor(score: number): string {
  if (score >= 85) return '#90be6d'
  if (score >= 65) return '#f9c74f'
  return '#ff6b6b'
}
</script>

<template>
  <div class="page">
    <!-- Background blobs -->
    <div class="blob blob-1" />
    <div class="blob blob-2" />
    <div class="blob blob-3" />

    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="router.back()">←</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">🍽️</div>

    <!-- Content -->
    <template v-else-if="restaurant">
      <div class="hero">
        <div class="emoji-wrap">
          <span class="emoji">{{ restaurant.emoji }}</span>
        </div>
      </div>

      <div class="content">
        <div class="name-row">
          <h1 class="name">{{ restaurant.name }}</h1>
        </div>

        <div class="chips">
          <span class="chip chip-cuisine">{{ restaurant.cuisine }}</span>
          <span class="chip" :class="restaurant.openNow ? 'chip-open' : 'chip-closed'">
            {{ restaurant.openNow ? '● Open now' : '● Closed' }}
          </span>
        </div>

        <div v-if="overallAvg !== null" class="rating-row">
          <span class="stars">★</span>
          <span class="rating-value" :style="{ color: scoreColor(overallAvg) }">{{ overallAvg }}</span>
          <span class="rating-max">/100</span>
          <span class="review-count">· {{ allVisits.length }} visit{{ allVisits.length > 1 ? 's' : '' }}</span>
        </div>

        <p class="description">{{ restaurant.description }}</p>

        <div class="info-block">
          <span class="info-icon">📍</span>
          <span class="info-text">{{ restaurant.address }}</span>
        </div>

        <div class="tags">
          <span v-for="tag in restaurant.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <!-- Visits -->
        <div class="visits-section">
          <!-- Tab switcher + new review -->
          <div class="tab-row">
            <div class="tab-bar">
              <button
                class="tab-btn"
                :class="{ 'tab-btn-active': activeTab === 'mine' }"
                @click="activeTab = 'mine'"
              >My Visits</button>
              <button
                class="tab-btn"
                :class="{ 'tab-btn-active': activeTab === 'community' }"
                @click="activeTab = 'community'"
              >Recent</button>
            </div>
            <NewReviewChip />
          </div>

          <!-- My Visits tab -->
          <template v-if="activeTab === 'mine'">
            <div v-if="!myVisits.length" class="no-visits">No visits yet 🍽️</div>
            <div v-for="visit in myVisits" :key="visit.id" class="visit-card">
              <div class="visit-header">
                <span class="visit-date">{{ formatDate(visit.date) }}</span>
                <span class="visit-avg" :style="{ backgroundColor: scoreColor(visitAvg(visit)) }">
                  {{ visitAvg(visit) }}
                </span>
              </div>
              <div class="criteria-list">
                <div class="criterion">
                  <span class="criterion-label">🍽️ Food</span>
                  <div class="criterion-bar-wrap">
                    <div class="criterion-bar" :style="{ width: `${visit.food}%`, backgroundColor: scoreColor(visit.food) }" />
                  </div>
                  <span class="criterion-score">{{ visit.food }}</span>
                </div>
                <div class="criterion">
                  <span class="criterion-label">🤝 Service</span>
                  <div class="criterion-bar-wrap">
                    <div class="criterion-bar" :style="{ width: `${visit.service}%`, backgroundColor: scoreColor(visit.service) }" />
                  </div>
                  <span class="criterion-score">{{ visit.service }}</span>
                </div>
                <div class="criterion">
                  <span class="criterion-label">✨ Decor</span>
                  <div class="criterion-bar-wrap">
                    <div class="criterion-bar" :style="{ width: `${visit.decor}%`, backgroundColor: scoreColor(visit.decor) }" />
                  </div>
                  <span class="criterion-score">{{ visit.decor }}</span>
                </div>
              </div>
            </div>
          </template>

          <!-- Community tab -->
          <template v-else>
            <div v-if="!recentVisits.length" class="no-visits">No recent visits 🍽️</div>
            <RouterLink v-for="cv in recentVisits" :key="cv.id" :to="`/user/${cv.user.id}`" class="community-card">
              <div class="community-user">
                <span class="community-avatar">{{ cv.user.avatar }}</span>
                <div class="community-user-info">
                  <span class="community-name">{{ cv.user.name }}</span>
                  <span class="community-date">{{ formatDate(cv.date) }}</span>
                </div>
              </div>
              <div class="community-scores">
                <RatingScores :food="cv.food" :service="cv.service" :decor="cv.decor" />
                <span class="community-avg" :style="{ backgroundColor: scoreColor(visitAvg(cv)) }">
                  {{ visitAvg(cv) }}
                </span>
              </div>
            </RouterLink>
          </template>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page {
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

/* Blobs */
.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 100px;
  height: 100px;
  background: rgba(249, 199, 79, 0.2);
  top: 5%;
  right: -20px;
}
.blob-2 {
  width: 60px;
  height: 60px;
  background: rgba(200, 100, 255, 0.25);
  top: 35%;
  left: -10px;
}
.blob-3 {
  width: 40px;
  height: 40px;
  background: rgba(76, 201, 240, 0.3);
  bottom: 25%;
  right: 10%;
}

/* Header */
.header {
  width: 100%;
  max-width: 420px;
  margin-bottom: 28px;
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
  background: rgba(255, 255, 255, 0.1);
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

/* Hero */
.hero {
  margin-bottom: 24px;
}
.emoji-wrap {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(249, 199, 79, 0.15), rgba(200, 100, 255, 0.15));
  border: 2px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
}

/* Content */
.content {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.name {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0;
}
.price {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
}
.chip-cuisine {
  background: rgba(76, 201, 240, 0.15);
  color: #4cc9f0;
  border: 1.5px solid #4cc9f0;
}
.chip-open {
  background: rgba(144, 190, 109, 0.15);
  color: #90be6d;
  border: 1.5px solid #90be6d;
}
.chip-closed {
  background: rgba(255, 107, 107, 0.15);
  color: #ff6b6b;
  border: 1.5px solid #ff6b6b;
}
.rating-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.stars {
  color: #f9c74f;
  font-size: 20px;
}
.rating-value {
  font-size: 22px;
  font-weight: 900;
}
.rating-max {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.35);
  font-weight: 600;
}
.review-count {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
}
.description {
  font-size: 15px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}
.info-block {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a1a;
  padding: 12px 16px;
  border-radius: 14px;
}
.info-icon {
  font-size: 18px;
}
.info-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  padding: 5px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  background: #1e1e1e;
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* Visits */
.visits-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

/* Tab bar */
.tab-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.tab-bar {
  display: flex;
  gap: 8px;
  background: #1a1a1a;
  padding: 4px;
  border-radius: 100px;
  align-self: flex-start;
}
.tab-btn {
  padding: 7px 18px;
  border-radius: 100px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  font-family: inherit;
}
.tab-btn-active {
  background: #ffffff;
  color: #0d0d0d;
}
.no-visits {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
}
.visit-card {
  background: #1a1a1a;
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.visit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.visit-date {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.55);
}
.visit-avg {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 900;
  color: #0d0d0d;
  flex-shrink: 0;
}
.criteria-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.criterion {
  display: flex;
  align-items: center;
  gap: 10px;
}
.criterion-label {
  font-size: 12px;
  font-weight: 700;
  width: 76px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.7);
}
.criterion-bar-wrap {
  flex: 1;
  height: 7px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  overflow: hidden;
}
.criterion-bar {
  height: 100%;
  border-radius: 100px;
  transition: width 0.4s ease;
}
.criterion-score {
  font-size: 13px;
  font-weight: 800;
  width: 28px;
  text-align: right;
  color: rgba(255, 255, 255, 0.8);
  flex-shrink: 0;
}

/* Community cards */
.community-card {
  background: #1a1a1a;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}
.community-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.community-avatar {
  font-size: 28px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.community-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.community-name {
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.community-date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  font-weight: 600;
}
.community-scores {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.community-score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.community-score-label {
  font-size: 12px;
}
.community-score-value {
  font-size: 12px;
  font-weight: 800;
}
.community-avg {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 900;
  color: #0d0d0d;
  flex-shrink: 0;
}
</style>
