<script setup lang="ts">
const features = [
  {
    tag: 'Rating system',
    title: 'Rate what really matters',
    description:
      'Food, service, and setting — three criteria that paint a complete picture of any dining experience. Add a personal "favorite" bonus for the places that defy all scoring.',
    bullets: [
      'Balanced 3-criteria scoring',
      'Optional favorite bonus',
      'Aggregate score calculated automatically',
    ],
    visual: { emoji: '⭐', gradient: 'linear-gradient(135deg, #fff8f5, #ffe8dc)', accent: '#FF6B35' },
    imageRight: false,
  },
  {
    tag: 'Tierlists',
    title: 'Your tierlist, your way',
    description:
      'Arrange restaurants from S to D tier. Reorder freely, add notes, and build a ranking that truly reflects your taste — whether you are a casual diner or a serious critic.',
    bullets: [
      'Drag & drop tierlist builder',
      'S to D tier ranking',
      'Add personal notes to any restaurant',
    ],
    visual: { emoji: '🏆', gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', accent: '#10b981' },
    imageRight: true,
  },
  {
    tag: 'Sharing',
    title: 'One link to share everything',
    description:
      'Generate a beautiful shareable page for your full tierlist. Friends can browse your rankings and discover restaurants — no account required to view.',
    bullets: [
      'Instant shareable link',
      'No account needed to view',
      'See who viewed your tierlist',
    ],
    visual: { emoji: '🔗', gradient: 'linear-gradient(135deg, #eff6ff, #dbeafe)', accent: '#3b82f6' },
    imageRight: false,
  },
  {
    tag: 'Community',
    title: 'Discover community picks',
    description:
      'Browse tierlists from hundreds of food lovers in your city. Find your next favourite restaurant through the honest, real-world ratings of people who share your taste.',
    bullets: [
      'Filter by city or cuisine',
      'Follow top-rated food lovers',
      'Save restaurants to your own list',
    ],
    visual: { emoji: '🌍', gradient: 'linear-gradient(135deg, #fdf4ff, #f3e8ff)', accent: '#8b5cf6' },
    imageRight: true,
  },
]
</script>

<template>
  <section class="features" id="restaurants">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <span class="section-eyebrow">Features</span>
        <h2 class="section-title">Everything you need<br />to rank like a pro</h2>
      </div>

      <div
        v-for="(feature, i) in features"
        :key="feature.tag"
        class="feature-row animate-on-scroll"
        :class="[`delay-${(i % 3) + 1}`, { 'feature-row--reverse': feature.imageRight }]"
      >
        <!-- Visual -->
        <div class="feature-visual" :style="{ background: feature.visual.gradient }">
          <div class="feature-visual__inner">
            <div class="feature-visual__icon" :style="{ background: feature.visual.accent + '22', color: feature.visual.accent }">
              {{ feature.visual.emoji }}
            </div>
            <div class="feature-visual__mockup">
              <div class="feature-mockup-card">
                <div class="fmc__bar" :style="{ width: '90%', background: feature.visual.accent }"></div>
                <div class="fmc__bar" :style="{ width: '70%', background: feature.visual.accent + 'aa' }"></div>
                <div class="fmc__bar" :style="{ width: '82%', background: feature.visual.accent + '77' }"></div>
              </div>
              <div class="feature-mockup-badge" :style="{ background: feature.visual.accent }">
                ✓ {{ feature.tag }}
              </div>
            </div>
          </div>
        </div>

        <!-- Text -->
        <div class="feature-text">
          <span class="feature-tag" :style="{ color: feature.visual.accent, background: feature.visual.accent + '18' }">
            {{ feature.tag }}
          </span>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
          <ul class="feature-bullets">
            <li v-for="bullet in feature.bullets" :key="bullet">
              <span class="feature-bullets__check" aria-hidden="true">✓</span>
              {{ bullet }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.features {
  padding: 96px 0;
  background: var(--color-bg-alt);
}

.section-header {
  text-align: center;
  margin-bottom: 80px;
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
  line-height: 1.15;
}

.feature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  align-items: center;
  margin-bottom: 80px;

  &:last-child {
    margin-bottom: 0;
  }

  &--reverse {
    .feature-visual { order: 2; }
    .feature-text { order: 1; }

    @media (max-width: 768px) {
      .feature-visual { order: 0; }
      .feature-text { order: 0; }
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}

.feature-visual {
  border-radius: var(--radius-2xl);
  min-height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  position: relative;
  overflow: hidden;

  @media (max-width: 480px) {
    min-height: 220px;
    padding: 28px;
  }

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    width: 100%;
  }

  &__icon {
    width: 80px;
    height: 80px;
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  }

  &__mockup {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    width: 100%;
  }
}

.feature-mockup-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-md);
}

.fmc__bar {
  height: 10px;
  border-radius: 5px;
  opacity: 0.85;
}

.feature-mockup-badge {
  font-size: 0.8125rem;
  font-weight: 700;
  color: white;
  padding: 6px 16px;
  border-radius: var(--radius-full);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.feature-text {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-tag {
  display: inline-block;
  font-size: 0.8125rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  width: fit-content;
}

.feature-title {
  font-size: clamp(1.375rem, 3vw, 1.875rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--color-text);
  line-height: 1.2;
}

.feature-description {
  font-size: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.75;
}

.feature-bullets {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.9375rem;
    color: var(--color-text);
    font-weight: 500;
  }

  &__check {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-primary-alpha);
    color: var(--color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 700;
    flex-shrink: 0;
  }
}
</style>
