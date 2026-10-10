<script setup lang="ts">
import { restaurantCountLabel } from '@/utils/profile'

defineProps<{
  id: number
  name: string
  emoji: string
  restaurantCount: number
  /** Pinned to its owner's profile: shows a small pin next to the name */
  pinned?: boolean
}>()
</script>

<template>
  <RouterLink :to="`/tierlists/${id}`" class="tierlist-card">
    <div class="cover">{{ emoji }}</div>

    <div class="info">
      <span class="title-row">
        <span class="name">{{ name }}</span>
        <svg
          v-if="pinned"
          class="pinned-badge"
          role="img"
          aria-label="Pinned to profile"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <title>Pinned to profile</title>
          <line x1="12" y1="17" x2="12" y2="22" />
          <path
            d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"
          />
        </svg>
      </span>
      <span class="count">{{ restaurantCountLabel(restaurantCount) }}</span>
    </div>

    <svg
      class="chevron"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </RouterLink>
</template>

<style scoped lang="scss">
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

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.pinned-badge {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.6);
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
