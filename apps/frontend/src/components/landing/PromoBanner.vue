<template>
  <section class="promo-banner">
    <div class="promo-banner__bg" aria-hidden="true"></div>
    <div class="container promo-banner__inner">
      <div class="promo-banner__content animate-on-scroll">
        <div class="promo-banner__icon" aria-hidden="true">🎉</div>
        <div class="promo-banner__text">
          <h2 class="promo-banner__title">Join 15,000+ food lovers already building their tierlists</h2>
          <p class="promo-banner__subtitle">
            Free forever for personal tierlists. Start rating your first restaurant in under a minute.
          </p>
        </div>
        <a href="#" class="btn btn--white btn--lg promo-banner__cta">
          Build your tierlist — it's free
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.promo-banner {
  padding: 80px 0;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--color-primary) 0%, #ff4500 100%);

  &__bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 10% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 90% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
    pointer-events: none;
  }

  &__inner {
    position: relative;
    z-index: 1;
  }

  &__content {
    display: flex;
    align-items: center;
    gap: 40px;

    @media (max-width: 900px) {
      flex-direction: column;
      text-align: center;
      gap: 28px;
    }
  }

  &__icon {
    font-size: 3.5rem;
    flex-shrink: 0;
    animation: bounce 2s ease-in-out infinite;

    @media (max-width: 768px) {
      font-size: 2.5rem;
    }
  }

  &__text {
    flex: 1;
  }

  &__title {
    font-size: clamp(1.375rem, 3vw, 1.875rem);
    font-weight: 800;
    color: white;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: 10px;
  }

  &__subtitle {
    font-size: 1rem;
    color: rgba(255, 255, 255, 0.82);
    line-height: 1.6;
  }

  &__cta {
    flex-shrink: 0;
  }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
</style>
