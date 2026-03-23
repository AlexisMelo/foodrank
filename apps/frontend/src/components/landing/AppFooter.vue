<script setup lang="ts">
const currentYear = new Date().getFullYear()

const links = {
  Product: [
    { label: 'How it works', href: '#how-it-works' },
    { label: 'Restaurants', href: '#restaurants' },
    { label: 'Tierlists', href: '#' },
    { label: 'Community', href: '#community' },
  ],
  Company: [
    { label: 'About us', href: '#' },
    { label: 'Blog', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Press', href: '#' },
  ],
  Legal: [
    { label: 'Privacy policy', href: '#' },
    { label: 'Terms of service', href: '#' },
    { label: 'Cookie policy', href: '#' },
  ],
}
</script>

<template>
  <footer class="footer">
    <div class="container">
      <div class="footer__top">
        <!-- Brand -->
        <div class="footer__brand">
          <a href="#" class="footer__logo" aria-label="Foodrank home">
            <span aria-hidden="true">🍽️</span>
            <span class="footer__logo-text">Foodrank</span>
          </a>
          <p class="footer__tagline">
            Rate restaurants. Build tierlists.<br />Share with friends.
          </p>
          <!-- Social -->
          <div class="footer__social" aria-label="Social media links">
            <a href="#" class="footer__social-link" aria-label="Follow us on Twitter/X">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.258 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/>
              </svg>
            </a>
            <a href="#" class="footer__social-link" aria-label="Follow us on Instagram">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
            <a href="#" class="footer__social-link" aria-label="Follow us on TikTok">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.67a8.18 8.18 0 004.78 1.52V6.73a4.85 4.85 0 01-1.01-.04z"/>
              </svg>
            </a>
          </div>
        </div>

        <!-- Nav columns -->
        <nav class="footer__nav" aria-label="Footer navigation">
          <div
            v-for="(items, category) in links"
            :key="category"
            class="footer__nav-col"
          >
            <h3 class="footer__nav-title">{{ category }}</h3>
            <ul class="footer__nav-list">
              <li v-for="link in items" :key="link.label">
                <a :href="link.href" class="footer__nav-link">{{ link.label }}</a>
              </li>
            </ul>
          </div>
        </nav>

        <!-- App download -->
        <div class="footer__download">
          <h3 class="footer__nav-title">Get the app</h3>
          <a href="#" class="footer__store-btn" aria-label="Download on the App Store">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Store
          </a>
          <a href="#" class="footer__store-btn" aria-label="Get it on Google Play">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.77-2.77-10.82 9.85zm-1.68-20.3C1.17 3.83 1 4.22 1 4.68v14.64c0 .46.17.85.5 1.22l.07.06 8.2-8.19v-.19L1.57 3.4l-.07.06zm18.68 8.92l-2.39-1.38-3.01 3.02 3.01 3.01 2.41-1.39c.69-.4.69-1.45-.02-1.86zM4.17.24L16.77 7.5l-2.77 2.77L3.18.24C3.48.07 3.87.07 4.17.24z"/>
            </svg>
            Google Play
          </a>
        </div>
      </div>

      <div class="footer__bottom">
        <p class="footer__copyright">© {{ currentYear }} Foodrank. All rights reserved.</p>
        <p class="footer__made-with">Made with ❤️ for food lovers everywhere</p>
      </div>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer {
  background: var(--color-text);
  color: rgba(255, 255, 255, 0.75);
  padding: 64px 0 0;

  &__top {
    display: grid;
    grid-template-columns: 1.5fr 2fr 1fr;
    gap: 48px;
    padding-bottom: 48px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    @media (max-width: 900px) {
      grid-template-columns: 1fr 1fr;
    }

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
      gap: 36px;
    }
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  &__logo {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 1.25rem;
    text-decoration: none;

    &-text {
      font-weight: 800;
      color: white;
    }
  }

  &__tagline {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.6);
  }

  &__social {
    display: flex;
    gap: 8px;
  }

  &__social-link {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: var(--color-primary);
      color: white;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__nav {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 32px;

    @media (max-width: 600px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__nav-title {
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: white;
    margin-bottom: 16px;
  }

  &__nav-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__nav-link {
    font-size: 0.9375rem;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.2s;

    &:hover {
      color: white;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      border-radius: 2px;
    }
  }

  &__download {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  &__store-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
    padding: 10px 16px;
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    font-weight: 600;
    transition: background 0.2s, color 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      color: white;
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  &__bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 0;
    flex-wrap: wrap;
    gap: 8px;

    @media (max-width: 600px) {
      flex-direction: column;
      text-align: center;
    }
  }

  &__copyright,
  &__made-with {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.45);
  }
}
</style>
