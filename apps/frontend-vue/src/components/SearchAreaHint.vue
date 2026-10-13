<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useUserLocation } from '@/composables/useUserLocation'
import { fetchSearchArea } from '@/services/restaurantService'
import type { SearchArea } from '@/types/restaurant'

const { location, status, requestLocation } = useUserLocation()

const area = ref<SearchArea | null>(null)

// Incremented on each position change so an outdated response is ignored
let requestId = 0

watch(
  location,
  async (current) => {
    const id = ++requestId
    try {
      const found = await fetchSearchArea(current)
      if (id === requestId) area.value = found
    } catch {
      if (id === requestId) area.value = null
    }
  },
  { immediate: true },
)

/** "Around Lyon", "Around you" when the city is unknown, or null if nothing to show */
const areaLabel = computed(() => {
  const granted = status.value === 'granted'
  // While the user's city is loading, don't keep showing the default one
  if (area.value?.locality && !(granted && area.value.isDefault))
    return `Around ${area.value.locality}`
  return granted ? 'Around you' : null
})

/** The user can be asked again (never asked, prompt dismissed, or position not obtained) */
const canAsk = computed(() => ['idle', 'dismissed', 'unavailable'].includes(status.value))
</script>

<template>
  <p class="search-area">
    <span class="pin">📍</span>
    <template v-if="status === 'pending'">Locating you…</template>
    <template v-else>
      <span v-if="areaLabel">{{ areaLabel }}</span>
      <template v-if="status !== 'granted'">
        <span v-if="areaLabel" class="separator">·</span>
        <button v-if="canAsk" type="button" class="enable-btn" @click="requestLocation">
          Enable location for nearby results
        </button>
        <span v-else-if="status === 'blocked'" class="blocked">
          Location blocked, allow it in your browser settings for nearby results
        </span>
      </template>
    </template>
  </p>
</template>

<style scoped lang="scss">
.search-area {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: -10px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
}

.pin {
  font-size: 12px;
}

.separator {
  color: rgba(255, 255, 255, 0.25);
}

.enable-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: #ffffff;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}
.enable-btn:hover {
  color: rgba(255, 255, 255, 0.8);
}

.blocked {
  color: rgba(255, 255, 255, 0.35);
}
</style>
