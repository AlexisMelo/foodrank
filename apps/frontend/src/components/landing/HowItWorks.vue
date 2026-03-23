<script setup lang="ts">
const steps = [
  {
    number: '01',
    emoji: '🔍',
    title: 'Browse & discover',
    description:
      'Search restaurants by city or cuisine, or explore what food lovers near you are rating right now.',
  },
  {
    number: '02',
    emoji: '⭐',
    title: 'Rate on 3 criteria',
    description:
      'Score food quality, service and setting independently. Add a personal "favorite" bonus for places that go beyond the numbers.',
  },
  {
    number: '03',
    emoji: '🔗',
    title: 'Share your tierlist',
    description:
      'Generate a shareable link in one tap. Your friends can browse your full ranking — no account needed to view.',
  },
]
</script>

<template>
  <section class="how-it-works" id="how-it-works">
    <div class="container">
      <div class="section-header animate-on-scroll">
        <span class="section-eyebrow">Simple by design</span>
        <h2 class="section-title">How Foodrank works</h2>
        <p class="section-subtitle">
          From your first bite to a shared tierlist, it takes less than a minute.
        </p>
      </div>

      <div class="steps">
        <div
          v-for="(step, i) in steps"
          :key="step.number"
          class="step animate-on-scroll"
          :class="`delay-${i + 1}`"
        >
          <div class="step__icon-wrap">
            <span class="step__emoji" aria-hidden="true">{{ step.emoji }}</span>
          </div>
          <div class="step__number" aria-hidden="true">{{ step.number }}</div>
          <h3 class="step__title">{{ step.title }}</h3>
          <p class="step__description">{{ step.description }}</p>
        </div>
      </div>

      <div class="how-it-works__cta animate-on-scroll delay-4">
        <a href="#" class="btn btn--primary btn--lg">Start rating for free</a>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.how-it-works {
  padding: 96px 0;
  background: var(--color-bg);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: -200px;
    top: 50%;
    transform: translateY(-50%);
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255, 107, 53, 0.07) 0%, transparent 70%);
    pointer-events: none;
  }
}

.section-header {
  text-align: center;
  margin-bottom: 64px;
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
  max-width: 520px;
  margin: 0 auto;
  line-height: 1.7;
}

.steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
  position: relative;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin: 0 auto;
  }

  // Connector line between steps on desktop
  &::before {
    content: '';
    position: absolute;
    top: 52px;
    left: calc(16.6% + 28px);
    right: calc(16.6% + 28px);
    height: 2px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
    opacity: 0.25;
    pointer-events: none;

    @media (max-width: 768px) {
      display: none;
    }
  }
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  padding: 32px 24px;
  background: var(--color-bg-alt);
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border);
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-6px);
    box-shadow: var(--shadow-lg);
  }

  &__icon-wrap {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--color-primary-alpha), var(--color-primary-alpha-hover));
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__emoji {
    font-size: 2rem;
  }

  &__number {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-primary);
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    padding: 3px 10px;
    border-radius: var(--radius-full);
    letter-spacing: 0.05em;
  }

  &__title {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__description {
    font-size: 0.9375rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
  }
}

.how-it-works__cta {
  text-align: center;
  margin-top: 48px;
}
</style>
