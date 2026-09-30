<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PlaceSuggestion } from '@/types/restaurant'
import { useUserLocation } from '@/composables/useUserLocation'
import {
  autocompletePlaces,
  searchPlaces,
  createRestaurantFromPlace,
} from '@/services/restaurantService'

const route = useRoute()
const router = useRouter()
const { location, requestLocation } = useUserLocation()
const query = computed(() => ((route.query.q as string) ?? '').trim())

const results = ref<PlaceSuggestion[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const moreLoaded = ref(false)
const error = ref(false)
const selecting = ref(false)

// Incremented on each new query so responses to an outdated query are ignored
let requestId = 0

async function loadSuggestions() {
  const current = ++requestId
  results.value = []
  moreLoaded.value = false
  error.value = false
  if (query.value.length < 3) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const found = await autocompletePlaces(query.value, location.value)
    if (current === requestId) results.value = found
  } catch {
    if (current === requestId) error.value = true
  } finally {
    if (current === requestId) loading.value = false
  }
}

/**
 * Longer search: appends the results not already shown
 */
async function loadMore() {
  const current = requestId
  loadingMore.value = true
  error.value = false
  try {
    const more = await searchPlaces(query.value, location.value)
    if (current !== requestId) return
    const known = new Set(results.value.map((r) => r.placeId))
    results.value = [...results.value, ...more.filter((r) => !known.has(r.placeId))]
    moreLoaded.value = true
  } catch {
    if (current === requestId) error.value = true
  } finally {
    loadingMore.value = false
  }
}

async function selectPlace(place: PlaceSuggestion) {
  if (selecting.value) return
  selecting.value = true
  error.value = false
  try {
    const restaurant = await createRestaurantFromPlace(place.placeId)
    router.push(`/review/${restaurant.id}`)
  } catch {
    error.value = true
  } finally {
    selecting.value = false
  }
}

requestLocation()
watch(query, loadSuggestions, { immediate: true })
</script>

<template>
  <div class="page">
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
    <template v-else>
      <div class="list" :class="{ selecting }">
        <button
          v-for="(r, index) in results"
          :key="r.placeId"
          type="button"
          class="list-item"
          @click="selectPlace(r)"
        >
          <div class="item-index">{{ index + 1 }}</div>
          <div class="item-emoji-wrap">
            <span class="item-emoji">🍽️</span>
          </div>
          <div class="item-info">
            <span class="item-name">{{ r.name }}</span>
            <span class="item-meta">{{ r.secondaryText }}</span>
          </div>
          <span class="item-arrow">›</span>
        </button>
      </div>

      <p v-if="error" class="hint">Search is unavailable right now</p>
      <p v-else-if="results.length === 0" class="hint">No restaurants found</p>

      <button
        v-if="!moreLoaded && query.length >= 3"
        type="button"
        class="load-more"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ loadingMore ? 'Loading…' : 'Load more' }}
      </button>

      <p v-if="results.length" class="attribution">
        ©
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">
          OpenStreetMap contributors
        </a>
      </p>
    </template>
  </div>
</template>

<style scoped lang="scss">
.page {
  color: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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

.list.selecting {
  opacity: 0.5;
  pointer-events: none;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 12px 14px;
  background: #1a1a1a;
  border: none;
  border-radius: 16px;
  text-align: left;
  font: inherit;
  cursor: pointer;
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

.hint {
  margin: 16px 0 0;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
}

.load-more {
  margin-top: 16px;
  height: 46px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.load-more:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
}
.load-more:disabled {
  opacity: 0.5;
  cursor: default;
}

.attribution {
  margin: 12px 0 0;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  text-align: right;
}
.attribution a {
  color: inherit;
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
