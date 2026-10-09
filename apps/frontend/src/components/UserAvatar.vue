<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  avatarUrl: string | null
}>()

/** Shown instead of the profile picture when the user has none */
const initial = computed(() => props.name.trim().charAt(0).toUpperCase() || '?')
</script>

<template>
  <!-- Size, background and font size come from the parent (class passed to the component) -->
  <img v-if="avatarUrl" :src="avatarUrl" alt="" class="user-avatar user-avatar-img" />
  <span v-else class="user-avatar user-avatar-initial">{{ initial }}</span>
</template>

<style scoped lang="scss">
.user-avatar {
  border-radius: 50%;
  flex-shrink: 0;
}
.user-avatar-img {
  object-fit: cover;
}
.user-avatar-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
}
</style>
