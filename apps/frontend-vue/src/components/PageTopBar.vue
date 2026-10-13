<script setup lang="ts">
defineProps<{
  /** Page title, next to the back arrow */
  title: string
  /** Route opened by the back arrow */
  backTo: string
}>()
</script>

<template>
  <header class="page-top-bar">
    <RouterLink :to="backTo" class="back-link" aria-label="Back">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </RouterLink>

    <h1 class="title">{{ title }}</h1>

    <!-- Page action (e.g. a submit button), at the top right -->
    <div class="action">
      <slot />
    </div>
  </header>
</template>

<style scoped lang="scss">
.page-top-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  background: #0d0d0d;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-left: -8px;
  border-radius: 50%;
  color: #ffffff;
  flex-shrink: 0;
  transition: background 0.15s;
}

.back-link:hover {
  background: rgba(255, 255, 255, 0.08);
}

.back-link svg {
  width: 22px;
  height: 22px;
}

.title {
  flex: 1;
  min-width: 0;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.action {
  flex-shrink: 0;
}
</style>
