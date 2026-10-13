<script setup lang="ts">
import { computed } from 'vue'
import { scoreColor } from '@/utils/rating'

const props = defineProps<{
  /** 0 to 100 */
  score: number
}>()

const rounded = computed(() => Math.round(props.score))
</script>

<template>
  <span
    class="global-score"
    :style="{ backgroundColor: scoreColor(rounded) }"
    :title="`Global rating: ${rounded}/100`"
    >{{ rounded }}</span
  >
</template>

<style scoped lang="scss">
.global-score {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 3px solid #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 900;
  color: #0d0d0d;
}
</style>
