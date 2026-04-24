<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchPinnedTierlistsByUserId } from '@/services/restaurantService'
import TierlistChip from '@/components/TierlistChip.vue'

const props = defineProps<{ userId: string }>()

const pinned = ref<{ id: string; name: string; emoji: string }[]>([])

onMounted(async () => {
  const tierlists = await fetchPinnedTierlistsByUserId(props.userId)
  pinned.value = tierlists.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji }))
})
</script>

<template>
  <div v-if="pinned.length" class="pinned-section">
    <h3 class="section-label">Pinned tierlists</h3>
    <div class="row">
      <TierlistChip
        v-for="t in pinned"
        :key="t.id"
        :id="t.id"
        :name="t.name"
        :emoji="t.emoji"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.pinned-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-label {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}

.row {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}

.row::-webkit-scrollbar {
  display: none;
}
</style>
