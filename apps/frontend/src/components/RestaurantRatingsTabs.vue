<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import type { RestaurantRating } from '@/types/restaurant'
import NewReviewChip from '@/components/NewReviewChip.vue'
import MyRatingCard from '@/components/MyRatingCard.vue'
import RecentRatingCard from '@/components/RecentRatingCard.vue'

const props = defineProps<{
  restaurantId: string
  myRatings: readonly RestaurantRating[]
  recentRatings: readonly RestaurantRating[]
  loading: boolean
  loadError: boolean
}>()

const activeTab = shallowRef<'mine' | 'recent'>('mine')

const ratings = computed(() => (activeTab.value === 'mine' ? props.myRatings : props.recentRatings))

const emptyMessage = computed(() =>
  activeTab.value === 'mine' ? 'No visits yet 🍽️' : 'No recent visits 🍽️',
)

/** A user rates a restaurant at most once per day */
function ratingKey(rating: RestaurantRating): string {
  return `${rating.userId}-${rating.date}`
}
</script>

<template>
  <div class="visits-section">
    <div class="tab-row">
      <div class="tab-bar">
        <button
          type="button"
          class="tab-btn tab-mine"
          :class="{ 'tab-btn-active': activeTab === 'mine' }"
          @click="activeTab = 'mine'"
        >
          My Visits
        </button>
        <button
          type="button"
          class="tab-btn tab-recent"
          :class="{ 'tab-btn-active': activeTab === 'recent' }"
          @click="activeTab = 'recent'"
        >
          Recent
        </button>
      </div>
      <NewReviewChip :restaurantId="restaurantId" />
    </div>

    <div v-if="loading" class="no-visits">Loading…</div>
    <div v-else-if="loadError" class="no-visits load-error">Couldn't load the ratings</div>
    <div v-else-if="!ratings.length" class="no-visits">{{ emptyMessage }}</div>
    <template v-else-if="activeTab === 'mine'">
      <MyRatingCard v-for="rating in ratings" :key="ratingKey(rating)" :rating="rating" />
    </template>
    <template v-else>
      <RecentRatingCard v-for="rating in ratings" :key="ratingKey(rating)" :rating="rating" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.visits-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}
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
  transition:
    background 0.2s,
    color 0.2s;
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
</style>
