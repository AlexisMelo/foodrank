<script setup lang="ts">
import { computed } from 'vue'
import type { RestaurantRating } from '@/types/restaurant'
import { formatRatingDate, ratingAverage, scoreColor } from '@/utils/rating'

const props = defineProps<{ rating: RestaurantRating }>()

const average = computed(() => ratingAverage(props.rating))

const criteria = computed(() => [
  { label: '🍽️ Food', score: Math.round(props.rating.food) },
  { label: '🤝 Service', score: Math.round(props.rating.service) },
  { label: '✨ Decor', score: Math.round(props.rating.setting) },
])
</script>

<template>
  <div class="visit-card">
    <div class="visit-header">
      <span class="visit-date">
        {{ formatRatingDate(rating.date) }}
        <span v-if="rating.bonus" class="crush" title="Instant crush">💘</span>
      </span>
      <span class="visit-avg" :style="{ backgroundColor: scoreColor(average) }">{{ average }}</span>
    </div>
    <div class="criteria-list">
      <div v-for="criterion in criteria" :key="criterion.label" class="criterion">
        <span class="criterion-label">{{ criterion.label }}</span>
        <div class="criterion-bar-wrap">
          <div
            class="criterion-bar"
            :style="{ width: `${criterion.score}%`, backgroundColor: scoreColor(criterion.score) }"
          />
        </div>
        <span class="criterion-score">{{ criterion.score }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
.crush {
  margin-left: 4px;
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
</style>
