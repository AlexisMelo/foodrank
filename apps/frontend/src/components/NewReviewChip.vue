<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useNewReview } from '@/composables/useNewReview'
import NewChip from '@/components/NewChip.vue'

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
  <NewChip @click="handleClick" />
</template>
