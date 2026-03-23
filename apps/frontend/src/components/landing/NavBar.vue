<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isScrolled = ref(false)
const mobileOpen = ref(false)

function onScroll() {
  isScrolled.value = window.scrollY > 20
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const navLinks = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Restaurants', href: '#restaurants' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Community', href: '#community' },
]

function closeMenu() {
  mobileOpen.value = false
}
</script>

<template>
  <nav class="navbar" :class="{ 'navbar--scrolled': isScrolled }" aria-label="Main navigation">
    <div class="container navbar__inner">
      <a href="#" class="navbar__logo" @click.prevent="closeMenu" aria-label="Foodrank home">
        <span class="navbar__logo-icon" aria-hidden="true">🍽️</span>
        <span class="navbar__logo-text">Foodrank</span>
      </a>

      <div class="navbar__links" :class="{ 'navbar__links--open': mobileOpen }">
        <a
          v-for="link in navLinks"
          :key="link.label"
          :href="link.href"
          class="navbar__link"
          @click="closeMenu"
        >
          {{ link.label }}
        </a>
        <a href="#" class="btn btn--primary navbar__cta" @click.prevent="closeMenu">
          Build your own tierlist
        </a>
      </div>

      <button
        class="navbar__hamburger"
        :class="{ 'is-open': mobileOpen }"
        @click="mobileOpen = !mobileOpen"
        :aria-expanded="mobileOpen"
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.navbar {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  &--scrolled {
    border-bottom-color: var(--color-border);
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.06);
  }

  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 72px;
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    flex-shrink: 0;

    &-icon {
      font-size: 1.5rem;
    }

    &-text {
      font-weight: 800;
      font-size: 1.25rem;
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }

  &__links {
    display: flex;
    align-items: center;
    gap: 32px;

    @media (max-width: 768px) {
      position: fixed;
      top: 72px;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 28px;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &--open {
        transform: translateX(0);
      }
    }
  }

  &__link {
    font-size: 0.9375rem;
    font-weight: 500;
    color: var(--color-text-secondary);
    transition: color 0.2s;

    @media (max-width: 768px) {
      font-size: 1.25rem;
    }

    &:hover {
      color: var(--color-text);
    }
  }

  &__cta {
    @media (max-width: 768px) {
      margin-top: 8px;
    }
  }

  &__hamburger {
    display: none;
    flex-direction: column;
    gap: 5px;
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: var(--radius-sm);
    transition: background 0.2s;

    &:hover {
      background: var(--color-bg-alt);
    }

    &:focus-visible {
      outline: 3px solid var(--color-primary);
    }

    @media (max-width: 768px) {
      display: flex;
    }

    span {
      display: block;
      width: 24px;
      height: 2px;
      background: var(--color-text);
      border-radius: 2px;
      transition: transform 0.3s ease, opacity 0.3s ease;
      transform-origin: center;
    }

    &.is-open {
      span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    }
  }
}
</style>
