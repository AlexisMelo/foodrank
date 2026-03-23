<script setup lang="ts">
defineProps<{
  emoji: string
  name: string
  food: number
  service: number
  decor: number
}>()

function scoreColor(score: number): string {
  if (score >= 85) return '#90be6d'
  if (score >= 65) return '#f9c74f'
  return '#ff6b6b'
}
</script>

<template>
  <div class="review-card">
    <div class="emoji-circle">{{ emoji }}</div>
    <span class="restaurant-name">{{ name }}</span>
    <div class="criteria">
      <div class="criterion">
        <span class="criterion-label">🍽️</span>
        <div class="criterion-bar-wrap">
          <div class="criterion-bar" :style="{ width: `${food}%`, backgroundColor: scoreColor(food) }" />
        </div>
        <span class="criterion-score" :style="{ color: scoreColor(food) }">{{ food }}</span>
      </div>
      <div class="criterion">
        <span class="criterion-label">🤝</span>
        <div class="criterion-bar-wrap">
          <div class="criterion-bar" :style="{ width: `${service}%`, backgroundColor: scoreColor(service) }" />
        </div>
        <span class="criterion-score" :style="{ color: scoreColor(service) }">{{ service }}</span>
      </div>
      <div class="criterion">
        <span class="criterion-label">✨</span>
        <div class="criterion-bar-wrap">
          <div class="criterion-bar" :style="{ width: `${decor}%`, backgroundColor: scoreColor(decor) }" />
        </div>
        <span class="criterion-score" :style="{ color: scoreColor(decor) }">{{ decor }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.review-card {
  flex-shrink: 0;
  width: 148px;
  background: #1a1a1a;
  border-radius: 20px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.emoji-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.restaurant-name {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  text-align: center;
  line-height: 1.3;
  width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.criteria {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.criterion {
  display: flex;
  align-items: center;
  gap: 6px;
}

.criterion-label {
  font-size: 11px;
  flex-shrink: 0;
}

.criterion-bar-wrap {
  flex: 1;
  height: 5px;
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
  font-size: 11px;
  font-weight: 800;
  width: 22px;
  text-align: right;
  flex-shrink: 0;
}
</style>
