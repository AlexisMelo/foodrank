<script setup lang="ts">
const partners = [
  'Le Bernardin', 'Nobu', 'Eleven Madison', 'Noma', 'Per Se', 'Alinea', 'Osteria Francescana',
]

const testimonials = [
  {
    initials: 'SM',
    name: 'Sarah M.',
    role: 'Food enthusiast',
    quote:
      'Finally an app that captures the full dining experience. Rating food, service AND setting separately makes every review so much more meaningful.',
    rating: 5,
    color: '#FF6B35',
  },
  {
    initials: 'MR',
    name: 'Marco R.',
    role: 'Foodie blogger',
    quote:
      "I've discovered so many hidden gems through other people's tierlists. Shared a city guide and got 2,000 views in a week — the community here is amazing.",
    rating: 5,
    color: '#10b981',
  },
  {
    initials: 'JL',
    name: 'Jade L.',
    role: 'Restaurant critic',
    quote:
      "The favorite bonus feature is genius. It lets me highlight places that go beyond the score — those spots where the whole experience just clicks.",
    rating: 5,
    color: '#3b82f6',
  },
]
</script>

<template>
  <section class="social-proof" id="reviews">
    <div class="container">
      <p class="social-proof__eyebrow animate-on-scroll">Trusted by food lovers worldwide</p>

      <!-- Partner logos -->
      <div class="partners animate-on-scroll delay-1">
        <div
          v-for="partner in partners"
          :key="partner"
          class="partner-badge"
        >
          {{ partner }}
        </div>
      </div>

      <!-- Testimonials -->
      <div class="testimonials">
        <div
          v-for="(t, i) in testimonials"
          :key="t.name"
          class="testimonial animate-on-scroll"
          :class="`delay-${i + 1}`"
        >
          <div class="testimonial__stars" aria-label="5 out of 5 stars">
            <span v-for="n in t.rating" :key="n">★</span>
          </div>
          <blockquote class="testimonial__quote">"{{ t.quote }}"</blockquote>
          <div class="testimonial__author">
            <div class="testimonial__avatar" :style="{ background: t.color }">
              {{ t.initials }}
            </div>
            <div>
              <div class="testimonial__name">{{ t.name }}</div>
              <div class="testimonial__role">{{ t.role }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.social-proof {
  padding: 80px 0;
  background: var(--color-bg-alt);

  &__eyebrow {
    text-align: center;
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-secondary);
    margin-bottom: 32px;
  }
}

.partners {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 64px;
}

.partner-badge {
  padding: 8px 20px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  transition: border-color 0.2s, color 0.2s, transform 0.2s;
  cursor: default;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    transform: translateY(-2px);
  }
}

.testimonials {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-width: 520px;
    margin: 0 auto;
  }
}

.testimonial {
  background: white;
  border-radius: var(--radius-xl);
  padding: 32px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  &__stars {
    color: #f59e0b;
    font-size: 1.125rem;
    letter-spacing: 2px;
  }

  &__quote {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--color-text-secondary);
    font-style: normal;
    flex: 1;
  }

  &__author {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: white;
    font-size: 0.8125rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  &__name {
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__role {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }
}
</style>
