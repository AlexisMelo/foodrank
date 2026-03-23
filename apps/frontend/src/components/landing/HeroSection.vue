<script setup lang="ts">
const trustItems = [
  { icon: '⭐', value: '4.8/5', label: 'Average rating' },
  { icon: '🍽️', value: '2,400+', label: 'Restaurants' },
  { icon: '🔗', value: '15k+', label: 'Tierlists shared' },
]
</script>

<template>
  <section class="hero">
    <div class="hero__bg-blob" aria-hidden="true"></div>
    <div class="container hero__inner">
      <!-- Left: Content -->
      <div class="hero__content">
        <div class="hero__badge">
          <span class="hero__badge-pulse"></span>
          New tierlists shared every day
        </div>

        <h1 class="hero__headline">
          So, where's<br />
          <span class="hero__headline-accent">dinner tonight?</span>
        </h1>

        <p class="hero__subtext">
          Rate restaurants on what truly matters — food quality, service & ambiance.
          Build your personal tierlist and share it with friends in one click.
        </p>

        <div class="hero__actions">
          <a href="#" class="btn btn--primary btn--lg">
            Explore Tierlists
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <a href="#how-it-works" class="btn btn--ghost btn--lg">See how it works</a>
        </div>

        <div class="hero__trust" aria-label="App statistics">
          <div
            v-for="(item, i) in trustItems"
            :key="item.label"
            class="trust-item"
          >
            <div v-if="i > 0" class="trust-divider" aria-hidden="true"></div>
            <span class="trust-item__icon" aria-hidden="true">{{ item.icon }}</span>
            <div>
              <div class="trust-item__value">{{ item.value }}</div>
              <div class="trust-item__label">{{ item.label }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Phone mockup -->
      <div class="hero__visual" aria-hidden="true">
        <div class="float-card float-card--top">
          <span class="float-card__emoji">🍝</span>
          <div class="float-card__body">
            <div class="float-card__name">La Trattoria Roma</div>
            <div class="float-card__stars">★★★★★ <span>9.4</span></div>
          </div>
        </div>

        <div class="phone">
          <div class="phone__speaker"></div>
          <div class="phone__screen">
            <div class="app-ui">
              <div class="app-header">
                <div class="app-avatar">SJ</div>
                <div class="app-header__info">
                  <div class="app-header__title">My Tierlist</div>
                  <div class="app-header__sub">14 restaurants</div>
                </div>
                <div class="app-share-btn">Share</div>
              </div>

              <div class="tier-row">
                <div class="tier-label tier-label--s">S</div>
                <div class="tier-cards">
                  <div class="mini-card">
                    <span>🥩</span>
                    <div class="mini-card__info">
                      <div class="mini-card__name">Maison</div>
                      <div class="mini-card__score">9.8</div>
                    </div>
                  </div>
                  <div class="mini-card">
                    <span>🍣</span>
                    <div class="mini-card__info">
                      <div class="mini-card__name">Sushi Kai</div>
                      <div class="mini-card__score">9.6</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="tier-row">
                <div class="tier-label tier-label--a">A</div>
                <div class="tier-cards">
                  <div class="mini-card">
                    <span>🍕</span>
                    <div class="mini-card__info">
                      <div class="mini-card__name">Napoli</div>
                      <div class="mini-card__score">8.7</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="tier-row">
                <div class="tier-label tier-label--b">B</div>
                <div class="tier-cards">
                  <div class="mini-card">
                    <span>🍔</span>
                    <div class="mini-card__info">
                      <div class="mini-card__name">Brewski</div>
                      <div class="mini-card__score">7.9</div>
                    </div>
                  </div>
                  <div class="mini-card">
                    <span>🌮</span>
                    <div class="mini-card__info">
                      <div class="mini-card__name">El Taco</div>
                      <div class="mini-card__score">7.4</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="app-rate-widget">
                <div class="app-rate-widget__title">Rate a restaurant</div>
                <div class="rate-bars">
                  <div class="rate-bar-row">
                    <span>🍽️</span>
                    <div class="rate-bar-track">
                      <div class="rate-bar-fill" style="width: 90%"></div>
                    </div>
                    <span class="rate-bar-val">9</span>
                  </div>
                  <div class="rate-bar-row">
                    <span>🤝</span>
                    <div class="rate-bar-track">
                      <div class="rate-bar-fill" style="width: 75%"></div>
                    </div>
                    <span class="rate-bar-val">7.5</span>
                  </div>
                  <div class="rate-bar-row">
                    <span>✨</span>
                    <div class="rate-bar-track">
                      <div class="rate-bar-fill" style="width: 85%"></div>
                    </div>
                    <span class="rate-bar-val">8.5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="float-card float-card--bottom">
          <span class="float-card__emoji">🎉</span>
          <div class="float-card__body">
            <div class="float-card__name">Tierlist shared!</div>
            <div class="float-card__stars" style="color: var(--color-text-secondary); font-size: 0.75rem;">47 views today</div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.hero {
  position: relative;
  padding: 80px 0 100px;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 48px 0 64px;
  }

  &__bg-blob {
    position: absolute;
    top: -20%;
    right: -10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(255, 107, 53, 0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;

    @media (max-width: 768px) {
      width: 300px;
      height: 300px;
      top: 0;
      right: -15%;
    }
  }

  &__inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: 64px;
    position: relative;
    z-index: 1;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
      gap: 56px;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: var(--color-primary-alpha);
    color: var(--color-primary-dark);
    font-weight: 600;
    font-size: 0.875rem;
    padding: 6px 14px;
    border-radius: var(--radius-full);
    width: fit-content;
  }

  &__badge-pulse {
    width: 8px;
    height: 8px;
    background: var(--color-primary);
    border-radius: 50%;
    display: inline-block;
    animation: pulse 2s infinite;
  }

  &__headline {
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    font-weight: 900;
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: var(--color-text);

    &-accent {
      color: var(--color-primary);
    }
  }

  &__subtext {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
    max-width: 480px;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  &__trust {
    display: flex;
    align-items: center;
    gap: 0;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
    flex-wrap: wrap;
    gap: 20px;
  }

  &__visual {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;

    @media (max-width: 900px) {
      order: -1;
    }
  }
}

// ─── Trust items ──────────────────────────────────────────────────────────────

.trust-item {
  display: flex;
  align-items: center;
  gap: 10px;

  &__icon {
    font-size: 1.25rem;
  }

  &__value {
    font-size: 1.0625rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__label {
    font-size: 0.8125rem;
    color: var(--color-text-secondary);
  }
}

.trust-divider {
  width: 1px;
  height: 32px;
  background: var(--color-border);
}

// ─── Phone Mockup ─────────────────────────────────────────────────────────────

.phone {
  width: 260px;
  height: 520px;
  background: #ffffff;
  border-radius: 36px;
  border: 8px solid #1a1a2e;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.1) inset,
    0 40px 80px rgba(0, 0, 0, 0.25),
    0 0 0 12px rgba(26, 26, 46, 0.08);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;

  &__speaker {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 48px;
    height: 5px;
    background: #1a1a2e;
    border-radius: 3px;
    z-index: 2;
  }

  &__screen {
    position: absolute;
    inset: 0;
    background: #f9fafb;
    overflow: hidden;
  }
}

// ─── App UI inside phone ──────────────────────────────────────────────────────

.app-ui {
  padding: 28px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);

  &__info {
    flex: 1;
  }

  &__title {
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__sub {
    font-size: 0.625rem;
    color: var(--color-text-secondary);
  }
}

.app-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
  color: white;
  font-size: 0.625rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.app-share-btn {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--color-primary-alpha);
  padding: 3px 8px;
  border-radius: 100px;
}

.tier-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.tier-label {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: white;

  &--s { background: #f59e0b; }
  &--a { background: #10b981; }
  &--b { background: #3b82f6; }
  &--c { background: #8b5cf6; }
}

.tier-cards {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.mini-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: white;
  border-radius: 8px;
  padding: 5px 8px;
  box-shadow: var(--shadow-sm);
  font-size: 0.75rem;

  &__info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
  }

  &__name {
    font-size: 0.625rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__score {
    font-size: 0.625rem;
    font-weight: 700;
    color: var(--color-primary);
  }
}

.app-rate-widget {
  background: white;
  border-radius: 12px;
  padding: 8px 10px;
  margin-top: auto;
  box-shadow: var(--shadow-sm);

  &__title {
    font-size: 0.625rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 6px;
  }
}

.rate-bars {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rate-bar-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.625rem;
}

.rate-bar-track {
  flex: 1;
  height: 4px;
  background: var(--color-bg-alt);
  border-radius: 2px;
  overflow: hidden;
}

.rate-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
  border-radius: 2px;
}

.rate-bar-val {
  font-weight: 700;
  color: var(--color-primary);
  min-width: 18px;
  text-align: right;
}

// ─── Floating cards ───────────────────────────────────────────────────────────

.float-card {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  box-shadow: var(--shadow-lg);
  z-index: 2;

  &__emoji {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  &__name {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
  }

  &__stars {
    font-size: 0.75rem;
    color: #f59e0b;
    font-weight: 600;

    span {
      color: var(--color-primary);
      font-weight: 700;
      margin-left: 4px;
    }
  }

  &--top {
    top: -16px;
    right: -16px;
    animation: floatY 3s ease-in-out infinite;

    @media (max-width: 480px) {
      right: 0;
    }
  }

  &--bottom {
    bottom: 16px;
    left: -24px;
    animation: floatY 3.5s ease-in-out infinite reverse;

    @media (max-width: 480px) {
      left: 0;
    }
  }
}

// ─── Keyframes ────────────────────────────────────────────────────────────────

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
}

@keyframes floatY {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}
</style>
