<script setup lang="ts">
import { computed } from 'vue'
import type { RestaurantRating } from '@/types/restaurant'
import { formatRatingDate, ratingAverage, scoreColor } from '@/utils/rating'
import RatingScores from '@/components/RatingScores.vue'

const props = defineProps<{ rating: RestaurantRating }>()

const average = computed(() => ratingAverage(props.rating))

/** Shown instead of the profile picture when the user has none */
const initial = computed(() => props.rating.userName.charAt(0).toUpperCase())
</script>

<template>
  <div class="community-card">
    <div class="community-user">
      <img
        v-if="rating.userAvatarUrl"
        :src="rating.userAvatarUrl"
        alt=""
        class="community-avatar community-avatar-img"
      />
      <span v-else class="community-avatar">{{ initial }}</span>
      <div class="community-user-info">
        <span class="community-name">{{ rating.userName }}</span>
        <span class="community-date">
          {{ formatRatingDate(rating.date) }}
          <span v-if="rating.bonus" title="Instant crush">💘</span>
        </span>
      </div>
    </div>
    <div class="community-scores">
      <RatingScores :food="rating.food" :service="rating.service" :decor="rating.setting" />
      <span class="community-avg" :style="{ backgroundColor: scoreColor(average) }">
        {{ average }}
      </span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.community-card {
  background: #1a1a1a;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.community-user {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.community-avatar {
  font-size: 16px;
  font-weight: 800;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.community-avatar-img {
  object-fit: cover;
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
