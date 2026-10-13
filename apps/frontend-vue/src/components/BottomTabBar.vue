<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { useNewReview } from '@/composables/useNewReview'

const { open: openNewReview } = useNewReview()

const router = useRouter()
const route = useRoute()

function isHome(): boolean {
  return route.path === '/'
}

function isTierlists(): boolean {
  return route.path === '/tierlists'
}

function isExplore(): boolean {
  return route.path === '/explore'
}
</script>

<template>
  <nav class="tab-bar">
    <button class="tab-btn" :class="{ active: isHome() }" @click="router.push('/')">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span>Home</span>
    </button>

    <button class="tab-btn" :class="{ active: isExplore() }" @click="router.push('/explore')">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
      <span>Explore</span>
    </button>

    <button class="tab-btn tab-btn-add" @click="openNewReview">
      <!-- Same 22px icon slot as the other tabs, so the label lines up; the circle overflows it upwards -->
      <span class="add-slot">
        <span class="add-circle">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </span>
      <span>Search</span>
    </button>

    <button class="tab-btn" :class="{ active: false }" disabled>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      <span>Activity</span>
    </button>

    <button class="tab-btn" :class="{ active: isTierlists() }" @click="router.push('/tierlists')">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="3" y="3" width="18" height="4" rx="1" />
        <rect x="3" y="10" width="14" height="4" rx="1" />
        <rect x="3" y="17" width="10" height="4" rx="1" />
      </svg>
      <span>Tierlists</span>
    </button>
  </nav>
</template>

<style scoped lang="scss">
.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
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
  flex-shrink: 0;
}

.add-slot {
  position: relative;
  width: 22px;
  height: 22px;
}

.add-circle {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #ffffff;
  color: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateX(-50%);
  box-shadow:
    0 -2px 24px rgba(255, 255, 255, 0.18),
    0 4px 20px rgba(0, 0, 0, 0.4);
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.tab-btn-add:hover .add-circle {
  transform: translateX(-50%) scale(1.07);
  box-shadow: 0 6px 24px rgba(255, 255, 255, 0.28);
}

.tab-btn-add:active .add-circle {
  transform: translateX(-50%) scale(0.95);
}

.tab-btn-add svg {
  width: 24px;
  height: 24px;
}
</style>
