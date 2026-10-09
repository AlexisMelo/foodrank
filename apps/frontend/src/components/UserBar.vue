<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { UserProfile } from '@/types/user'
import UserAvatar from '@/components/UserAvatar.vue'
import { restaurantCountLabel } from '@/utils/profile'

const props = defineProps<{
  profile: UserProfile
  /** Shows the number of restaurants rated next to the name */
  showCount?: boolean
}>()

const router = useRouter()

const countLabel = computed(() => restaurantCountLabel(props.profile.ratedRestaurantsCount))
</script>

<template>
  <button type="button" class="user-bar" @click="router.push('/profile')">
    <UserAvatar :name="profile.name" :avatarUrl="profile.avatarUrl" class="avatar" />
    <span class="user-name">{{ profile.name }}</span>
    <span v-if="showCount" class="user-visited">{{ countLabel }}</span>
  </button>
</template>

<style scoped lang="scss">
.user-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a1a;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 10px 14px;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s;
}
.user-bar:hover {
  background: #222;
}
.avatar {
  font-size: 16px;
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.06);
}
.user-name {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-visited {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}
</style>
