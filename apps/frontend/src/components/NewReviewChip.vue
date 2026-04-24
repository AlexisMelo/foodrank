<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNewReview } from '@/composables/useNewReview'

const props = defineProps<{ restaurantId?: string }>()
const router = useRouter()
const { open } = useNewReview()

function handleClick() {
  if (props.restaurantId) {
    router.push(`/review/${props.restaurantId}`)
  } else {
    open()
  }
}
</script>

<template>
  <button class="add-chip" @click="handleClick">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    New
  </button>
</template>

<style scoped lang="scss">
.add-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px 4px 6px;
  border-radius: 100px;
  border: 1.5px solid rgba(255, 255, 255, 0.15);
  background: transparent;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.add-chip:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.8);
}
.add-chip svg {
  width: 14px;
  height: 14px;
}
</style>
