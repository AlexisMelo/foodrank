<script setup lang="ts">
</script>

<template>
  <div class="tierlists-view">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

    <header class="page-header">
      <h1 class="page-title">Tierlists</h1>
      <p class="page-subtitle">Group your restaurants into shareable lists</p>
    </header>

    <div class="empty-state">
      <div class="empty-icon">🏆</div>
      <p class="empty-title">No tierlists yet</p>
      <p class="empty-desc">Create your first tierlist to start grouping your favorite restaurants.</p>
    </div>
  </div>
</template>

<style scoped>
.tierlists-view {
  min-height: 100dvh;
  background: #0d0d0d;
  color: #ffffff;
  padding: 0 20px 100px;
  position: relative;
  overflow: hidden;
  max-width: 420px;
  margin: 0 auto;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  z-index: 0;
}

.blob-1 {
  width: 300px;
  height: 300px;
  background: rgba(255, 180, 0, 0.08);
  top: -80px;
  right: -60px;
}

.blob-2 {
  width: 250px;
  height: 250px;
  background: rgba(255, 80, 80, 0.06);
  bottom: 200px;
  left: -80px;
}

.page-header {
  position: relative;
  z-index: 1;
  padding-top: 64px;
  margin-bottom: 40px;
}

.page-title {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0 0 6px;
}

.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
}

.empty-state {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 80px;
  text-align: center;
}

.empty-icon {
  font-size: 56px;
  line-height: 1;
  margin-bottom: 8px;
}

.empty-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.empty-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  margin: 0;
  max-width: 260px;
  line-height: 1.5;
}
</style>
