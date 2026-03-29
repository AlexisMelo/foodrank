<script setup lang="ts">
import type { Restaurant } from '@/types/restaurant'

defineProps<{
  id: string
  name: string
  description: string
  emoji: string
  restaurants: Restaurant[]
}>()
</script>

<template>
  <RouterLink :to="`/tierlists/${id}`" class="tierlist-card">
    <div class="cover">{{ emoji }}</div>

    <div class="info">
      <span class="name">{{ name }}</span>
      <span class="count">{{ restaurants.length }} restaurants</span>
    </div>

    <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </RouterLink>
</template>

<style scoped>
.tierlist-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, 0.05);
  transition: background 0.15s;
}

.tierlist-card:active {
  background: #1f1f1f;
}

.cover {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.name {
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.count {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

.chevron {
  width: 16px;
  height: 16px;
  color: rgba(255, 255, 255, 0.25);
  flex-shrink: 0;
}
</style>
