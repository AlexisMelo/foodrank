<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Restaurant, Tierlist } from '@/types/restaurant'
import { fetchTierlistsByUserId, fetchRestaurants } from '@/services/restaurantService'
import TierlistCard from '@/components/TierlistCard.vue'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID } = useAuth()

type SortKey = 'recent' | 'az' | 'updated'

const tierlists = ref<(Tierlist & { resolvedRestaurants: Restaurant[] })[]>([])
const loading = ref(true)
const sortBy = ref<SortKey>('recent')

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recently created' },
  { key: 'updated', label: 'Recently updated' },
  { key: 'az', label: 'A–Z' },
]

onMounted(async () => {
  const [userTierlists, allRestaurants] = await Promise.all([
    fetchTierlistsByUserId(CURRENT_USER_ID),
    fetchRestaurants(),
  ])
  const restaurantMap = new Map(allRestaurants.map((r) => [r.id, r]))
  tierlists.value = userTierlists.map((t) => ({
    ...t,
    resolvedRestaurants: t.restaurants
      .map((e) => restaurantMap.get(e.restaurantId)!)
      .filter(Boolean),
  }))
  loading.value = false
})

const sortedTierlists = computed(() => {
  const list = [...tierlists.value]
  if (sortBy.value === 'recent') {
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }
  if (sortBy.value === 'updated') {
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  }
  return list.sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div class="tierlists-view">
    <header class="page-header">
      <h1 class="page-title">My Tierlists</h1>
      <p class="page-subtitle">Your personal restaurant collections</p>
    </header>

    <div class="sort-row">
      <button
        v-for="opt in SORT_OPTIONS"
        :key="opt.key"
        class="sort-chip"
        :class="{ active: sortBy === opt.key }"
        @click="sortBy = opt.key"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="loading" class="list">
      <div v-for="i in 4" :key="i" class="skeleton" />
    </div>

    <div v-else-if="sortedTierlists.length === 0" class="empty-state">
      <div class="empty-icon">🏆</div>
      <p class="empty-title">No tierlists yet</p>
      <p class="empty-desc">
        Create your first tierlist to start grouping your favorite restaurants.
      </p>
    </div>

    <div v-else class="list">
      <TierlistCard
        v-for="t in sortedTierlists"
        :key="t.id"
        :id="t.id"
        :name="t.name"
        :description="t.description"
        :emoji="t.emoji"
        :restaurants="t.resolvedRestaurants"
      />
    </div>
  </div>
</template>

<style scoped>
.tierlists-view {
  min-height: 100dvh;
  color: #ffffff;
  overflow: hidden;
}

.page-header {
  position: relative;
  z-index: 1;
  padding-top: 64px;
  margin-bottom: 20px;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.sort-row {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.sort-chip {
  padding: 6px 14px;
  border-radius: 100px;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
  white-space: nowrap;
}

.sort-chip.active {
  border-color: #ffffff;
  color: #0d0d0d;
  background: #ffffff;
}

.list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton {
  height: 76px;
  border-radius: 16px;
  background: #161616;
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

.empty-state {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 80px;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.empty-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  line-height: 1.5;
}
</style>
