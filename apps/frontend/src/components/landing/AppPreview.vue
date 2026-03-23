<script setup lang="ts">
const screens = [
  {
    label: 'Browse & discover',
    emoji: '🔍',
    bg: '#fff8f5',
    accent: '#FF6B35',
    items: [
      { emoji: '🍣', name: 'Sushi Kai', score: '9.6', tier: 'S' },
      { emoji: '🥩', name: 'Maison', score: '9.8', tier: 'S' },
      { emoji: '🍕', name: 'Napoli', score: '8.7', tier: 'A' },
    ],
  },
  {
    label: 'Rate in 3 criteria',
    emoji: '⭐',
    bg: '#f0fdf4',
    accent: '#10b981',
    criteria: [
      { icon: '🍽️', label: 'Food', val: 9, pct: '90%' },
      { icon: '🤝', label: 'Service', val: 8, pct: '80%' },
      { icon: '✨', label: 'Setting', val: 7.5, pct: '75%' },
    ],
  },
  {
    label: 'Build your tierlist',
    emoji: '🏆',
    bg: '#eff6ff',
    accent: '#3b82f6',
    tiers: [
      { label: 'S', emoji: '🥩', name: 'Maison', score: '9.8' },
      { label: 'A', emoji: '🍕', name: 'Napoli', score: '8.7' },
      { label: 'B', emoji: '🍔', name: 'Brewski', score: '7.9' },
    ],
  },
  {
    label: 'Share with one link',
    emoji: '🔗',
    bg: '#fdf4ff',
    accent: '#8b5cf6',
    shareInfo: {
      title: 'My Paris Tierlist',
      author: 'Sarah M.',
      views: '2.4k views',
      restaurants: '12 restaurants',
    },
  },
]
</script>

<template>
  <section class="app-preview" id="community">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <span class="section-eyebrow">App preview</span>
        <h2 class="section-title">See Foodrank in action</h2>
        <p class="section-subtitle">Every screen designed to make restaurant rating effortless.</p>
      </div>
    </div>

    <div class="preview-scroll-wrapper" role="region" aria-label="App screen previews">
      <div class="preview-track">
        <div
          v-for="(screen, i) in screens"
          :key="screen.label"
          class="preview-item animate-on-scroll"
          :class="`delay-${i + 1}`"
        >
          <!-- Phone -->
          <div class="preview-phone">
            <div class="preview-phone__speaker"></div>
            <div class="preview-phone__screen" :style="{ background: screen.bg }">
              <!-- Header -->
              <div class="preview-header">
                <span class="preview-header__emoji">{{ screen.emoji }}</span>
                <span class="preview-header__title">{{ screen.label }}</span>
              </div>

              <!-- Screen: browse -->
              <template v-if="screen.items">
                <div class="preview-content">
                  <div class="preview-search">🔍 Search restaurants...</div>
                  <div class="preview-list">
                    <div v-for="item in screen.items" :key="item.name" class="preview-restaurant">
                      <span class="preview-restaurant__emoji">{{ item.emoji }}</span>
                      <div class="preview-restaurant__info">
                        <div class="preview-restaurant__name">{{ item.name }}</div>
                        <div class="preview-restaurant__tier" :style="{ color: screen.accent }">Tier {{ item.tier }}</div>
                      </div>
                      <div class="preview-restaurant__score" :style="{ color: screen.accent }">{{ item.score }}</div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Screen: rating -->
              <template v-else-if="screen.criteria">
                <div class="preview-content">
                  <div class="preview-restaurant-name">🍣 Sushi Kai</div>
                  <div class="preview-criteria">
                    <div v-for="c in screen.criteria" :key="c.label" class="preview-criterion">
                      <div class="preview-criterion__top">
                        <span>{{ c.icon }} {{ c.label }}</span>
                        <span class="preview-criterion__val" :style="{ color: screen.accent }">{{ c.val }}/10</span>
                      </div>
                      <div class="preview-criterion__track">
                        <div class="preview-criterion__fill" :style="{ width: c.pct, background: screen.accent }"></div>
                      </div>
                    </div>
                  </div>
                  <div class="preview-save-btn" :style="{ background: screen.accent }">Save rating</div>
                </div>
              </template>

              <!-- Screen: tierlist -->
              <template v-else-if="screen.tiers">
                <div class="preview-content">
                  <div v-for="tier in screen.tiers" :key="tier.label" class="preview-tier-row">
                    <div class="preview-tier-label" :style="{ background: screen.accent }">{{ tier.label }}</div>
                    <div class="preview-tier-card">
                      <span>{{ tier.emoji }}</span>
                      <span class="preview-tier-name">{{ tier.name }}</span>
                      <span class="preview-tier-score" :style="{ color: screen.accent }">{{ tier.score }}</span>
                    </div>
                  </div>
                  <div class="preview-share-btn" :style="{ background: screen.accent }">Share tierlist →</div>
                </div>
              </template>

              <!-- Screen: share -->
              <template v-else-if="screen.shareInfo">
                <div class="preview-content preview-share-content">
                  <div class="preview-link-box">
                    <div class="preview-link-icon" :style="{ color: screen.accent }">🔗</div>
                    <div class="preview-link-text">foodrank.app/s/sarah-paris</div>
                  </div>
                  <div class="preview-share-card">
                    <div class="preview-share-title">{{ screen.shareInfo.title }}</div>
                    <div class="preview-share-author">by {{ screen.shareInfo.author }}</div>
                    <div class="preview-share-stats">
                      <span :style="{ color: screen.accent }">{{ screen.shareInfo.views }}</span>
                      <span>·</span>
                      <span>{{ screen.shareInfo.restaurants }}</span>
                    </div>
                  </div>
                  <div class="preview-copy-btn" :style="{ background: screen.accent }">Copy link ✓</div>
                </div>
              </template>
            </div>
          </div>

          <!-- Label -->
          <p class="preview-label" :style="{ color: screen.accent }">{{ screen.label }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.app-preview {
  padding: 96px 0;
  background: var(--color-bg);
  overflow: hidden;
}

.section-header {
  text-align: center;
  margin-bottom: 56px;
}

.section-eyebrow {
  display: inline-block;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  margin-bottom: 12px;
}

.section-title {
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--color-text);
  margin-bottom: 16px;
}

.section-subtitle {
  font-size: 1.0625rem;
  color: var(--color-text-secondary);
}

.preview-scroll-wrapper {
  overflow-x: auto;
  padding: 0 24px 24px;
  -webkit-overflow-scrolling: touch;

  // Hide scrollbar visually while keeping functionality
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;

  &::-webkit-scrollbar {
    height: 4px;
  }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }

  @media (min-width: 1300px) {
    overflow-x: visible;
    padding: 0 calc((100vw - 1200px) / 2) 0;
  }
}

.preview-track {
  display: flex;
  gap: 32px;
  padding: 16px 8px 32px;
  min-width: max-content;

  @media (min-width: 1300px) {
    min-width: unset;
    justify-content: center;
  }
}

.preview-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.preview-phone {
  width: 220px;
  height: 440px;
  background: white;
  border-radius: 30px;
  border: 6px solid #1a1a2e;
  box-shadow:
    0 0 0 1px rgba(255,255,255,0.08) inset,
    0 30px 60px rgba(0, 0, 0, 0.2),
    0 0 0 10px rgba(26, 26, 46, 0.06);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow:
      0 0 0 1px rgba(255,255,255,0.08) inset,
      0 40px 80px rgba(0, 0, 0, 0.25),
      0 0 0 10px rgba(26, 26, 46, 0.06);
  }

  &__speaker {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background: #1a1a2e;
    border-radius: 2px;
    z-index: 2;
  }

  &__screen {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 22px 12px 10px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text);
  border-bottom: 1px solid rgba(0,0,0,0.06);
}

.preview-header__emoji {
  font-size: 0.875rem;
}

.preview-content {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: calc(100% - 48px);
  overflow: hidden;
}

// Browse screen
.preview-search {
  background: white;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.625rem;
  color: var(--color-text-tertiary);
  box-shadow: var(--shadow-sm);
}

.preview-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-restaurant {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border-radius: 8px;
  padding: 7px 8px;
  box-shadow: var(--shadow-sm);

  &__emoji { font-size: 1rem; }

  &__info { flex: 1; }

  &__name {
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__tier {
    font-size: 0.5625rem;
    font-weight: 700;
  }

  &__score {
    font-size: 0.75rem;
    font-weight: 800;
  }
}

// Rating screen
.preview-restaurant-name {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 4px;
}

.preview-criteria {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.preview-criterion {
  &__top {
    display: flex;
    justify-content: space-between;
    font-size: 0.5625rem;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin-bottom: 3px;
  }

  &__val { font-weight: 700; }

  &__track {
    height: 5px;
    background: rgba(0,0,0,0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.6s ease;
  }
}

.preview-save-btn {
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  text-align: center;
  padding: 8px;
  border-radius: 8px;
  margin-top: 8px;
}

// Tierlist screen
.preview-tier-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.preview-tier-label {
  width: 20px;
  height: 20px;
  border-radius: 5px;
  color: white;
  font-size: 0.625rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.preview-tier-card {
  display: flex;
  align-items: center;
  gap: 5px;
  background: white;
  border-radius: 7px;
  padding: 5px 7px;
  flex: 1;
  box-shadow: var(--shadow-sm);
  font-size: 0.75rem;
}

.preview-tier-name {
  flex: 1;
  font-size: 0.5625rem;
  font-weight: 600;
  color: var(--color-text);
}

.preview-tier-score {
  font-size: 0.5625rem;
  font-weight: 800;
}

.preview-share-btn {
  color: white;
  font-size: 0.5625rem;
  font-weight: 700;
  text-align: center;
  padding: 6px;
  border-radius: 7px;
  margin-top: 4px;
}

// Share screen
.preview-share-content {
  justify-content: center;
  gap: 12px;
}

.preview-link-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border-radius: 8px;
  padding: 8px 10px;
  box-shadow: var(--shadow-sm);
}

.preview-link-icon { font-size: 1rem; }

.preview-link-text {
  font-size: 0.5rem;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.preview-share-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  box-shadow: var(--shadow-md);
  text-align: center;
}

.preview-share-title {
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text);
}

.preview-share-author {
  font-size: 0.5625rem;
  color: var(--color-text-secondary);
  margin: 3px 0;
}

.preview-share-stats {
  display: flex;
  justify-content: center;
  gap: 6px;
  font-size: 0.5625rem;
  color: var(--color-text-secondary);
  font-weight: 600;
}

.preview-copy-btn {
  color: white;
  font-size: 0.5625rem;
  font-weight: 700;
  text-align: center;
  padding: 7px;
  border-radius: 7px;
}

// Label
.preview-label {
  font-size: 0.875rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}
</style>
