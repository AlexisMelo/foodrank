<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { SIGNUP_STEP_COUNT, type SignupStep } from '@/utils/signup'

const props = defineProps<{
  /** Step shown, for the label and the progress bar */
  step: SignupStep
  /** Title of the step */
  title: string
  /** Route opened by the back arrow */
  backTo: RouteLocationRaw
}>()

const progressStyle = computed(() => ({ width: `${(props.step / SIGNUP_STEP_COUNT) * 100}%` }))
</script>

<template>
  <div class="signup-step">
    <RouterLink :to="backTo" class="back-link" aria-label="Back">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
      </svg>
    </RouterLink>

    <div class="progress-header">
      <span class="step-label">Step {{ step }}</span>
      <div
        class="progress"
        role="progressbar"
        aria-valuemin="1"
        :aria-valuemax="SIGNUP_STEP_COUNT"
        :aria-valuenow="step"
        :aria-valuetext="`Step ${step} of ${SIGNUP_STEP_COUNT}`"
      >
        <div class="progress-fill" :style="progressStyle" />
      </div>
    </div>

    <h1 class="step-title">{{ title }}</h1>

    <slot />
  </div>
</template>

<style scoped lang="scss">
.signup-step {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
  color: #ffffff;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-left: -8px;
  border-radius: 50%;
  color: #ffffff;
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  svg {
    width: 22px;
    height: 22px;
  }
}

.progress-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.progress {
  height: 4px;
  border-radius: 2px;
  background: #2a2a2a;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  background: #ffffff;
  transition: width 0.3s ease;
}

.step-title {
  font-size: 26px;
  font-weight: 900;
  letter-spacing: -0.5px;
  line-height: 1.2;
}
</style>
