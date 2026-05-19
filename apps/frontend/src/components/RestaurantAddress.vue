<script setup lang="ts">
defineProps<{ address: string }>()
</script>

<template>
  <div class="info-block">
    <span class="info-icon">📍</span>
    <span class="info-text">{{ address }}</span>
  </div>
</template>

<style scoped lang="scss">
.info-block {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a1a;
  padding: 12px 16px;
  border-radius: 14px;
}
.info-icon {
  font-size: 18px;
}
.info-text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.65);
}
</style>
