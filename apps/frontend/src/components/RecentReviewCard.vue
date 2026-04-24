<script setup lang="ts">
defineProps<{
  restaurantId: string
  emoji: string
  name: string
  date: string
  food: number
  service: number
  decor: number
}>()

function scoreColor(score: number): string {
  if (score >= 85) return '#90be6d'
  if (score >= 65) return '#f9c74f'
  return '#ff6b6b'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
</script>

<template>
  <RouterLink :to="`/restaurant/${restaurantId}`" class="review-card">
    <div class="emoji-wrap">
      <div class="emoji-circle">{{ emoji }}</div>
      <div class="avg-bubble" :style="{ backgroundColor: scoreColor(Math.round((food + service + decor) / 3)) }">
        {{ Math.round((food + service + decor) / 3) }}
      </div>
    </div>
    <span class="restaurant-name">{{ name }}</span>
    <span class="visit-date">{{ formatDate(date) }}</span>
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
  </RouterLink>
</template>

<style scoped lang="scss">
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
  text-decoration: none;
  color: inherit;
  transition: background 0.2s, transform 0.15s;
}

.review-card:hover {
  background: #242424;
  transform: translateY(-2px);
}

.review-card:active {
  transform: translateY(0);
}

.emoji-wrap {
  position: relative;
  flex-shrink: 0;
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
}

.avg-bubble {
  position: absolute;
  bottom: 0;
  right: -4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 900;
  color: #0d0d0d;
  border: 2px solid #1a1a1a;
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

.visit-date {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
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
