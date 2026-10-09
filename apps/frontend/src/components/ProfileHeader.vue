<script setup lang="ts">
import { computed } from 'vue'
import type { UserProfile } from '@/types/user'
import UserAvatar from '@/components/UserAvatar.vue'
import { restaurantCountLabel } from '@/utils/profile'

const props = defineProps<{ profile: UserProfile }>()

const countLabel = computed(() => restaurantCountLabel(props.profile.ratedRestaurantsCount))
</script>

<template>
  <div class="winner-section">
    <div class="winner-avatar-wrap">
      <UserAvatar :name="profile.name" :avatarUrl="profile.avatarUrl" class="winner-avatar" />
    </div>
    <h2 class="winner-name">{{ profile.name }}</h2>
    <div class="winner-tag">{{ countLabel }}</div>
  </div>
</template>

<style scoped lang="scss">
.winner-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;
}
.winner-avatar-wrap {
  position: relative;
  margin-bottom: 14px;
}
.winner-avatar {
  width: 110px;
  height: 110px;
  background: linear-gradient(135deg, #f9c74f33, #c77dff33);
  border: 3px solid rgba(249, 199, 79, 0.5);
  font-size: 44px;
}
.winner-name {
  font-size: 26px;
  font-weight: 800;
  margin: 0 0 10px;
  letter-spacing: -0.5px;
  text-align: center;
}
.winner-tag {
  display: block;
  padding: 6px 18px;
  border-radius: 100px;
  background: rgba(144, 190, 109, 0.25);
  color: #90be6d;
  border: 1.5px solid #90be6d;
  font-size: 14px;
  font-weight: 700;
}
</style>
