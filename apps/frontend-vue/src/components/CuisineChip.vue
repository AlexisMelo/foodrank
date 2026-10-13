<script setup lang="ts">
defineProps<{ cuisine: string }>()
</script>

<template>
  <span class="chip-cuisine">{{ cuisine }}</span>
</template>

<style scoped lang="scss">
.chip-cuisine {
  display: inline-block;
  padding: 5px 14px;
  border-radius: 100px;
  font-size: 13px;
  font-weight: 700;
  background: rgba(76, 201, 240, 0.15);
  color: #4cc9f0;
  border: 1.5px solid #4cc9f0;
}
</style>
