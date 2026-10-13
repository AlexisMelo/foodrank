<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import RankedRestaurantItem from '@/components/RankedRestaurantItem.vue'
import PinnedTierlists from '@/components/PinnedTierlists.vue'
import ProfileHeader from '@/components/ProfileHeader.vue'
import { useUserProfile } from '@/composables/useUserProfile'
import { useProfileRanking } from '@/composables/useProfileRanking'
import { ME } from '@/services/userService'

const route = useRoute()
const router = useRouter()

// /profile: the logged-in user; /user/:id: another user
const profileUserId = computed(() => (route.params.id as string | undefined) || ME)

const { profile, loading: profileLoading, notFound } = useUserProfile(profileUserId)
const {
  rankedRestaurants,
  isOwnProfile,
  loading: rankingLoading,
} = useProfileRanking(profileUserId)

const loading = computed(() => profileLoading.value || rankingLoading.value)

watch(notFound, (missing) => {
  if (missing) router.replace('/')
})
</script>

<template>
  <div class="profile">
    <div v-if="loading" class="loading">👤</div>

    <template v-else-if="profile">
      <ProfileHeader :profile="profile" />

      <!-- Pinned tierlists -->
      <PinnedTierlists :userId="profile.id" />

      <!-- Restaurants rated, best first -->
      <div v-if="!rankedRestaurants.length" class="empty">No restaurant rated yet 🍽️</div>
      <div v-else class="list">
        <RankedRestaurantItem
          v-for="(restaurant, index) in rankedRestaurants"
          :key="restaurant.restaurantId"
          :restaurantId="restaurant.restaurantId"
          :emoji="restaurant.emoji"
          :name="restaurant.name"
          :cuisine="restaurant.cuisine"
          :food="restaurant.food"
          :service="restaurant.service"
          :decor="restaurant.setting"
          :overall="restaurant.overall"
          :index="index"
          :myScore="restaurant.myScore"
          :rateLink="
            !isOwnProfile && restaurant.myScore === undefined
              ? `/review/${restaurant.restaurantId}`
              : undefined
          "
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.profile {
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

/* Pinned tierlists spacing */
:deep(.pinned-section) {
  margin-bottom: 24px;
}

.empty {
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
  padding: 20px 0;
}

.list {
  width: 100%;

  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
