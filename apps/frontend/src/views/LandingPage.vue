<script setup lang="ts">
import { useScrollAnimation } from '@/composables/useScrollAnimation'
import NavBar from '@/components/landing/NavBar.vue'
import HeroSection from '@/components/landing/HeroSection.vue'
import SocialProof from '@/components/landing/SocialProof.vue'
import HowItWorks from '@/components/landing/HowItWorks.vue'
import FeatureHighlights from '@/components/landing/FeatureHighlights.vue'
import AppPreview from '@/components/landing/AppPreview.vue'
import PromoBanner from '@/components/landing/PromoBanner.vue'
import FinalCTA from '@/components/landing/FinalCTA.vue'
import AppFooter from '@/components/landing/AppFooter.vue'

useScrollAnimation()
</script>

<template>
  <div class="landing">
    <NavBar />
    <main id="main-content">
      <HeroSection />
      <SocialProof />
      <HowItWorks />
      <FeatureHighlights />
      <AppPreview />
      <PromoBanner />
      <FinalCTA />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.landing {
  min-height: 100vh;
}
</style>
