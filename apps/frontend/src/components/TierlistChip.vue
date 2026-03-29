<script setup lang="ts">
defineProps<{
  id: string
  name: string
  emoji: string
}>()
</script>

<template>
  <RouterLink :to="`/tierlists/${id}`" class="tierlist-chip">
    <div class="tierlist-chip-cover">{{ emoji }}</div>
    <span class="tierlist-chip-name">{{ name }}</span>
  </RouterLink>
</template>

<style scoped>
.tierlist-chip {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: inherit;
  width: 72px;
}

.tierlist-chip-cover {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  background: #1a1a1a;
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  transition: background 0.15s;
}

.tierlist-chip:active .tierlist-chip-cover {
  background: #252525;
}

.tierlist-chip-name {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
