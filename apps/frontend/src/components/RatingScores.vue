<script setup lang="ts">
defineProps<{
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
  <div class="rating-scores">
    <div class="score-item">
      <span class="score-label">🍽️</span>
      <span class="score-value" :style="{ color: scoreColor(food) }">{{ Math.round(food) }}</span>
    </div>
    <div class="score-item">
      <span class="score-label">🤝</span>
      <span class="score-value" :style="{ color: scoreColor(service) }">{{ Math.round(service) }}</span>
    </div>
    <div class="score-item">
      <span class="score-label">✨</span>
      <span class="score-value" :style="{ color: scoreColor(decor) }">{{ Math.round(decor) }}</span>
    </div>
  </div>
</template>

<style scoped>
.rating-scores {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.score-label {
  font-size: 12px;
}
.score-value {
  font-size: 12px;
  font-weight: 800;
}
</style>
