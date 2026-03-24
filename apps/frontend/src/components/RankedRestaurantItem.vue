<script setup lang="ts">
import RatingScores from '@/components/RatingScores.vue'

const props = defineProps<{
  restaurantId: string
  emoji: string
  name: string
  cuisine: string
  food: number
  service: number
  decor: number
  overall: number
  index: number
}>()

function scoreColor(score: number) {
  if (score >= 85) return '#90be6d'
  if (score >= 65) return '#f9c74f'
  return '#ff6b6b'
}

function itemBackground(index: number) {
  if (index === 0) return '#ffffff'
  if (index === 1) return 'rgba(255,255,255,0.14)'
  if (index === 2) return 'rgba(255,255,255,0.07)'
  return '#1a1a1a'
}
</script>

<template>
  <RouterLink
    :to="`/restaurant/${restaurantId}`"
    class="list-item"
    :class="{ 'list-item-first': index === 0 }"
    :style="{ background: itemBackground(index) }"
  >
    <div class="item-avatar">
      <span class="item-emoji">{{ emoji }}</span>
    </div>
    <div class="item-info">
      <span class="item-name">{{ name }}</span>
      <span class="item-sub">{{ cuisine }}</span>
    </div>
    <RatingScores :food="food" :service="service" :decor="decor" />
    <div class="item-avg" :style="{ backgroundColor: scoreColor(Math.round(overall)) }">
      {{ Math.round(overall) }}
    </div>
  </RouterLink>
</template>

<style scoped>
.list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
}
.list-item-first {
  color: #0d0d0d;
}
.list-item-first .item-name {
  color: #0d0d0d;
}
.list-item-first .item-sub {
  color: #555;
}
.item-avatar {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.list-item-first .item-avatar {
  background: rgba(0, 0, 0, 0.06);
}
.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.item-name {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
}
.item-avg {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 12px;
  color: #0d0d0d;
  flex-shrink: 0;
}
</style>
