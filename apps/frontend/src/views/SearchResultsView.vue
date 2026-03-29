<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant } from '@/types/restaurant'
import { fetchRestaurants } from '@/services/restaurantService'

const route = useRoute()
const router = useRouter()
const query = route.query.q as string

const results = ref<Restaurant[]>([])
const loading = ref(true)

onMounted(async () => {
  const all = await fetchRestaurants()
  const shuffled = [...all].sort(() => Math.random() - 0.5)
  results.value = shuffled.slice(0, 10)
  loading.value = false
})
</script>

<template>
  <div class="page">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

    <!-- Header -->
    <div class="header">
      <button class="back-btn" @click="router.back()">←</button>
    </div>

    <!-- Title block -->
    <div class="title-block">
      <div class="query-label">Results for</div>
      <h1 class="query">"{{ query }}"</h1>
      <p class="cta">Tap a restaurant to leave your review</p>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="list">
      <div v-for="i in 10" :key="i" class="skeleton" />
    </div>

    <!-- Results -->
    <div v-else class="list">
      <RouterLink
        v-for="(r, index) in results"
        :key="r.id"
        :to="`/review/${r.id}`"
        class="list-item"
      >
        <div class="item-index">{{ index + 1 }}</div>
        <div class="item-emoji-wrap">
          <span class="item-emoji">{{ r.emoji }}</span>
        </div>
        <div class="item-info">
          <span class="item-name">{{ r.name }}</span>
          <span class="item-meta">{{ r.cuisine }}</span>
        </div>
        <span class="item-arrow">›</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  background: #0d0d0d;
  color: #ffffff;
  padding: 24px 20px 40px;
  display: flex;
  flex-direction: column;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 180px;
  height: 180px;
  background: rgba(76, 201, 240, 0.07);
  top: -60px;
  right: -40px;
}
.blob-2 {
  width: 120px;
  height: 120px;
  background: rgba(199, 125, 255, 0.07);
  bottom: 20%;
  left: -30px;
}

.header {
  margin-bottom: 28px;
}

.back-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 28px;
}

.query-label {
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.query {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.5px;
  margin: 0;
  color: #ffffff;
}

.cta {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.38);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: #1a1a1a;
  border-radius: 16px;
  text-decoration: none;
  color: inherit;
  transition:
    background 0.15s,
    transform 0.15s;
}
.list-item:hover {
  background: #222222;
  transform: translateX(2px);
}

.item-index {
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.2);
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.item-emoji-wrap {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.38);
  font-weight: 600;
}

.item-arrow {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.skeleton {
  height: 68px;
  border-radius: 16px;
  background: #1a1a1a;
  animation: pulse 1.2s ease-in-out infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>
