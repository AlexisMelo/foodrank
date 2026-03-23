<template>
  <section class="final-cta">
    <div class="final-cta__bg" aria-hidden="true">
      <div class="final-cta__blob final-cta__blob--1"></div>
      <div class="final-cta__blob final-cta__blob--2"></div>
    </div>
    <div class="container final-cta__inner">
      <div class="final-cta__emoji animate-on-scroll" aria-hidden="true">🍽️</div>
      <h2 class="final-cta__title animate-on-scroll delay-1">
        Build your own tierlist<br />and share it with your friends!
      </h2>
      <p class="final-cta__subtitle animate-on-scroll delay-2">
        Your honest restaurant rankings deserve to be seen.
        Start with one restaurant — build a list worth sharing.
      </p>
      <div class="final-cta__actions animate-on-scroll delay-3">
        <a href="#" class="btn btn--primary btn--lg">
          Get started for free
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
        <div class="final-cta__stores">
          <a href="#" class="store-btn" aria-label="Download on the App Store">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div>
              <div class="store-btn__sub">Download on the</div>
              <div class="store-btn__name">App Store</div>
            </div>
          </a>
          <a href="#" class="store-btn" aria-label="Get it on Google Play">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.77-2.77-10.82 9.85zm-1.68-20.3C1.17 3.83 1 4.22 1 4.68v14.64c0 .46.17.85.5 1.22l.07.06 8.2-8.19v-.19L1.57 3.4l-.07.06zm18.68 8.92l-2.39-1.38-3.01 3.02 3.01 3.01 2.41-1.39c.69-.4.69-1.45-.02-1.86zM4.17.24L16.77 7.5l-2.77 2.77L3.18.24C3.48.07 3.87.07 4.17.24z"/>
            </svg>
            <div>
              <div class="store-btn__sub">Get it on</div>
              <div class="store-btn__name">Google Play</div>
            </div>
          </a>
        </div>
      </div>

      <div class="final-cta__trust animate-on-scroll delay-4">
        <span>✓ Free forever for personal use</span>
        <span>·</span>
        <span>✓ No credit card required</span>
        <span>·</span>
        <span>✓ Share instantly</span>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.final-cta {
  padding: 120px 0;
  background: var(--color-bg-warm);
  text-align: center;
  position: relative;
  overflow: hidden;

  &__bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__blob {
    position: absolute;
    border-radius: 50%;

    &--1 {
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(255, 107, 53, 0.12) 0%, transparent 70%);
      top: -100px;
      left: -100px;
    }

    &--2 {
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, rgba(255, 107, 53, 0.08) 0%, transparent 70%);
      bottom: -80px;
      right: -80px;
    }
  }

  &__inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
  }

  &__emoji {
    font-size: 4rem;
    animation: float 4s ease-in-out infinite;
  }

  &__title {
    font-size: clamp(2rem, 5vw, 3.25rem);
    font-weight: 900;
    letter-spacing: -0.03em;
    color: var(--color-text);
    line-height: 1.1;
    max-width: 700px;

    br {
      @media (max-width: 600px) {
        display: none;
      }
    }
  }

  &__subtitle {
    font-size: 1.125rem;
    color: var(--color-text-secondary);
    line-height: 1.7;
    max-width: 480px;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    margin-top: 8px;
  }

  &__stores {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  &__trust {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 8px;
  }
}

.store-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: var(--color-text);
  color: white;
  padding: 10px 20px;
  border-radius: var(--radius-lg);
  transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
  text-decoration: none;

  &:hover {
    background: #2d2d4a;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  }

  &:focus-visible {
    outline: 3px solid var(--color-primary);
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
  }

  &__sub {
    font-size: 0.6875rem;
    opacity: 0.75;
    line-height: 1;
  }

  &__name {
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.2;
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
</style>
