<script setup lang="ts">
import { shallowRef, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { UserRating } from '@/types/rating'
import type { Tierlist } from '@/types/tierlist'
import type { UserProfile } from '@/types/user'
import { fetchUserRatings } from '@/services/ratingService'
import { fetchUserProfile, ME } from '@/services/userService'
import { fetchTierlistById, setTierlistPinned } from '@/services/tierlistService'
import { overallByRestaurant, rankTierlistRestaurants } from '@/utils/ranking'
import { restaurantCountLabel } from '@/utils/profile'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import TierlistPinButton from '@/components/TierlistPinButton.vue'

const route = useRoute()
const router = useRouter()

const tierlist = shallowRef<Tierlist | null>(null)
const owner = shallowRef<UserProfile | null>(null)
const isOwner = shallowRef(false)
const ownerRatings = shallowRef<UserRating[]>([])
const myRatings = shallowRef<UserRating[]>([])
const pinSaving = shallowRef(false)
const pinError = shallowRef(false)
const loading = shallowRef(true)

onMounted(async () => {
  const found = await fetchTierlistById(route.params.id as string)
  if (!found) {
    router.replace('/tierlists')
    return
  }
  tierlist.value = found

  const [me, foundOwner, ratingsOfOwner, ratingsOfMe] = await Promise.all([
    fetchUserProfile(ME),
    fetchUserProfile(found.userId),
    fetchUserRatings(found.userId),
    fetchUserRatings(ME),
  ])
  isOwner.value = me?.id === found.userId
  owner.value = foundOwner ?? null
  ownerRatings.value = ratingsOfOwner
  myRatings.value = ratingsOfMe
  loading.value = false
})

// Saved through the API, so the pin shows on the profile; the button shows the saved state, unchanged on failure
async function togglePin() {
  if (!tierlist.value || pinSaving.value) return
  pinSaving.value = true
  pinError.value = false
  try {
    tierlist.value = await setTierlistPinned(tierlist.value.id, !tierlist.value.pinned)
  } catch {
    pinError.value = true
  } finally {
    pinSaving.value = false
  }
}

// Restaurants of the tierlist, best first by the owner's scores; on someone else's tierlist, with my own score
const rankedRestaurants = computed(() => {
  if (!tierlist.value) return []
  const myScores = overallByRestaurant(myRatings.value)
  return rankTierlistRestaurants(
    tierlist.value.restaurants.map((e) => e.restaurantId),
    ownerRatings.value,
  ).map((r) => ({ ...r, myScore: isOwner.value ? undefined : myScores.get(r.restaurantId) }))
})
</script>

<template>
  <div class="detail-view">
    <div v-if="loading" class="loading">⏳</div>

    <template v-else-if="tierlist">
      <div class="hero">
        <div class="cover">{{ tierlist.emoji }}</div>
        <h1 class="title">{{ tierlist.name }}</h1>
        <p v-if="tierlist.description" class="description">{{ tierlist.description }}</p>

        <template v-if="isOwner">
          <TierlistPinButton :pinned="tierlist.pinned" :saving="pinSaving" @toggle="togglePin" />
          <p v-if="pinError" class="pin-error">Couldn't update the pin, try again.</p>
        </template>
      </div>

      <div class="list-header">
        <RouterLink v-if="owner" :to="`/user/${owner.id}`" class="owner">
          <UserAvatar :name="owner.name" :avatarUrl="owner.avatarUrl" class="owner-avatar" />
          <span class="owner-name">{{ owner.name }}</span>
        </RouterLink>
        <span class="meta-chip">{{ restaurantCountLabel(rankedRestaurants.length) }}</span>
      </div>

      <div class="restaurant-list">
        <RankedRestaurantItem
          v-for="(r, index) in rankedRestaurants"
          :key="r.restaurantId"
          :restaurantId="r.restaurantId"
          :emoji="r.emoji"
          :name="r.name"
          :cuisine="r.cuisine"
          :food="r.food"
          :service="r.service"
          :decor="r.setting"
          :overall="r.overall"
          :index="index"
          :myScore="r.myScore"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.detail-view {
  min-height: 100dvh;
  color: #ffffff;
  overflow: hidden;
}

.loading {
  font-size: 48px;
  text-align: center;
  margin-top: 40%;
  animation: pulse 1s ease-in-out infinite;
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

.hero {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 0 32px;
  gap: 12px;
}

.cover {
  width: 120px;
  height: 120px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  margin-bottom: 4px;
}

.title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.4px;
  margin: 0;
}

.description {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
  line-height: 1.5;
}

.list-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.owner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
}

.owner-avatar {
  width: 20px;
  height: 20px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.owner-name {
  font-size: 13px;
  font-weight: 600;
}

.meta-chip {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.08);
  padding: 4px 10px;
  border-radius: 100px;
}

.pin-error {
  font-size: 13px;
  color: #ff6b6b;
  margin: 0;
}

.restaurant-list {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
