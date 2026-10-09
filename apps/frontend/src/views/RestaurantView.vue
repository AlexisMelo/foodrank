<script setup lang="ts">
import { ref, shallowRef, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Restaurant } from '@/types/restaurant'
import { fetchRestaurantById, createRestaurantFromPlace } from '@/services/restaurantService'
import CuisineChip from '@/components/CuisineChip.vue'
import RestaurantAddress from '@/components/RestaurantAddress.vue'
import RestaurantRatingsTabs from '@/components/RestaurantRatingsTabs.vue'
import { useRestaurantRatings } from '@/composables/useRestaurantRatings'

const route = useRoute()
const router = useRouter()
const restaurant = ref<Restaurant | null>(null)
const loading = shallowRef(true)
const loadError = shallowRef(false)

// Loaded once the restaurant is known, and again each time this page is opened (e.g. right after rating it)
const {
  recentRatings,
  myRatings,
  loading: ratingsLoading,
  loadError: ratingsLoadError,
} = useRestaurantRatings(() => restaurant.value?.id ?? null)

/**
 * Loads the restaurant from the route:
 * - /restaurant/place/:placeId (opened from the search): gets or creates it in the database,
 *   then replaces the URL with its stable /restaurant/:id
 * - /restaurant/:id: reads it from the database
 */
async function loadRestaurant() {
  // The watcher can fire while leaving this view (e.g. to /user/:id): only handle restaurant routes
  if (!route.path.startsWith('/restaurant/')) return

  const placeId = route.params.placeId as string | undefined
  const id = route.params.id as string | undefined

  // Already displayed (e.g. right after replacing /restaurant/place/... with /restaurant/:id)
  if (id && restaurant.value?.id === id) return

  loading.value = true
  loadError.value = false
  try {
    let found: Restaurant | undefined
    if (placeId) {
      found = await createRestaurantFromPlace(placeId)
      router.replace(`/restaurant/${found.id}`)
    } else if (id) {
      found = await fetchRestaurantById(id)
    }
    if (!found) {
      router.replace('/')
      return
    }
    restaurant.value = found
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}

watch(() => route.params, loadRestaurant, { immediate: true })
</script>

<template>
  <div class="page">
    <!-- Loading -->
    <div v-if="loading" class="loading">🍽️</div>

    <!-- Error (e.g. place provider unavailable) -->
    <div v-else-if="loadError" class="load-error">
      <p>Couldn't load this restaurant</p>
      <button type="button" class="back-btn" @click="router.back()">Go back</button>
    </div>

    <!-- Content -->
    <template v-else-if="restaurant">
      <div class="hero">
        <div class="emoji-wrap">
          <span class="emoji">{{ restaurant.emoji || '🍽️' }}</span>
        </div>
      </div>

      <div class="content">
        <div class="name-row">
          <h1 class="name">{{ restaurant.name }}</h1>
        </div>

        <div v-if="restaurant.cuisine" class="chips">
          <CuisineChip :cuisine="restaurant.cuisine" />
        </div>

        <p v-if="restaurant.description" class="description">{{ restaurant.description }}</p>

        <RestaurantAddress v-if="restaurant.address" :address="restaurant.address" />

        <div v-if="restaurant.tags?.length" class="tags">
          <span v-for="tag in restaurant.tags" :key="tag" class="tag">{{ tag }}</span>
        </div>

        <RestaurantRatingsTabs
          :restaurantId="restaurant.id"
          :myRatings="myRatings"
          :recentRatings="recentRatings"
          :loading="ratingsLoading"
          :loadError="ratingsLoadError"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.page {
  color: #ffffff;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Loading */
.loading {
  font-size: 48px;
  animation: pulse 1s ease-in-out infinite;
  margin-top: 40%;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.9);
  }
}

/* Error */
.load-error {
  margin-top: 40%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 15px;
  font-weight: 600;
}
.load-error p {
  margin: 0;
}
.back-btn {
  padding: 10px 20px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

/* Hero */
.hero {
  margin-bottom: 24px;
}
.emoji-wrap {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(249, 199, 79, 0.15), rgba(200, 100, 255, 0.15));
  border: 2px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 64px;
}

/* Content */
.content {
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 16px;
}
.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.name {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0;
}
.price {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
}
.chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
}
.chip-cuisine {
  background: rgba(76, 201, 240, 0.15);
  color: #4cc9f0;
  border: 1.5px solid #4cc9f0;
}
.description {
  font-size: 15px;
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}
.info-block {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a1a;
  padding: 12px 16px;
  border-radius: 14px;
}
.info-icon {
  font-size: 18px;
}
.info-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag {
  padding: 5px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  background: #1e1e1e;
  color: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
