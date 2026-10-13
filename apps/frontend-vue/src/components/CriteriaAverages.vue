<script setup lang="ts">
import { computed } from 'vue'
import type { RatingSummary } from '@/types/rating'
import { scoreColor } from '@/utils/rating'

const props = defineProps<{ summary: RatingSummary }>()

const criteria = computed(() => [
  { label: '🍽️ Food', score: Math.round(props.summary.food ?? 0) },
  { label: '🤝 Service', score: Math.round(props.summary.service ?? 0) },
  { label: '✨ Decor', score: Math.round(props.summary.setting ?? 0) },
])

const countLabel = computed(() =>
  props.summary.count === 1 ? '1 rating' : `${props.summary.count} ratings`,
)
</script>

<template>
  <div class="criteria-averages">
    <p v-if="summary.count === 0" class="no-rating">No ratings yet</p>
    <template v-else>
      <div v-for="criterion in criteria" :key="criterion.label" class="criterion">
        <div class="criterion-header">
          <span class="criterion-label">{{ criterion.label }}</span>
          <span class="criterion-score">{{ criterion.score }}</span>
        </div>
        <div class="criterion-bar-wrap">
          <div
            class="criterion-bar"
            :style="{ width: `${criterion.score}%`, backgroundColor: scoreColor(criterion.score) }"
          />
        </div>
      </div>
      <span class="rating-count">{{ countLabel }}</span>
    </template>
  </div>
</template>

<style scoped lang="scss">
.criteria-averages {
  background: #1a1a1a;
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.no-rating {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}
.criterion {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.criterion-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.criterion-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}
.criterion-score {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.8);
}
.criterion-bar-wrap {
  height: 6px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  overflow: hidden;
}
.criterion-bar {
  height: 100%;
  border-radius: 100px;
  transition: width 0.4s ease;
}
.rating-count {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  text-align: right;
}
</style>
