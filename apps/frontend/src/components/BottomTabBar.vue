<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useNewReview } from '@/composables/useNewReview'

const { open: openNewReview } = useNewReview()

const CURRENT_USER_ID = 'alex'

const router = useRouter()
const route = useRoute()

function isHome(): boolean {
  return route.path === '/'
}

function isProfile(): boolean {
  return route.path === '/profile' || route.path === `/user/${CURRENT_USER_ID}`
}
</script>

<template>
  <nav class="tab-bar">
    <button class="tab-btn" :class="{ active: isHome() }" @click="router.push('/')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Home</span>
    </button>

    <button class="tab-btn" :class="{ active: false }" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      <span>Ratings</span>
    </button>

    <button class="tab-btn tab-btn-add" @click="openNewReview">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <button class="tab-btn" :class="{ active: false }" disabled>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      <span>Activity</span>
    </button>

    <button class="tab-btn" :class="{ active: isProfile() }" @click="router.push('/profile')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>Profile</span>
    </button>
  </nav>
</template>

<style scoped>
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 420px;
  height: 72px;
  background: rgba(18, 18, 18, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 8px;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 100;
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 12px;
  transition: color 0.2s;
  font-family: inherit;
}

.tab-btn:disabled {
  cursor: default;
}

.tab-btn svg {
  width: 22px;
  height: 22px;
}

.tab-btn span {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2px;
}

.tab-btn.active {
  color: #ffffff;
}

.tab-btn-add {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ffffff;
  color: #0d0d0d;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  top: -16px;
  box-shadow: 0 -2px 24px rgba(255, 255, 255, 0.18), 0 4px 20px rgba(0, 0, 0, 0.4);
  transition: transform 0.15s, box-shadow 0.15s;
}

.tab-btn-add:hover {
  transform: scale(1.07);
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.28);
}

.tab-btn-add:active {
  transform: scale(0.95);
}

.tab-btn-add svg {
  width: 24px;
  height: 24px;
}
</style>
