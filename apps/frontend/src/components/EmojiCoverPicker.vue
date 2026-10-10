<script setup lang="ts">
import { shallowRef } from 'vue'

/** Emoji displayed as the cover */
const emoji = defineModel<string>({ required: true })

defineProps<{
  /** Emojis the user can pick from */
  options: readonly string[]
}>()

const isOpen = shallowRef(false)

/**
 * Use the picked emoji as the cover, then close the grid
 */
function pick(option: string) {
  emoji.value = option
  isOpen.value = false
}
</script>

<template>
  <div class="emoji-cover-picker" @keydown.esc="isOpen = false">
    <!-- type="button": the picker is used inside forms, opening it must not submit them -->
    <button
      type="button"
      class="cover"
      aria-label="Change the picture"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="cover-emoji">{{ emoji }}</span>
      <span class="cover-badge" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
      </span>
    </button>

    <!-- Invisible layer under the popup: a tap anywhere else closes it -->
    <div v-if="isOpen" class="emoji-backdrop" @click="isOpen = false" />

    <div v-if="isOpen" class="emoji-grid" role="group" aria-label="Pick an emoji">
      <button
        v-for="option in options"
        :key="option"
        type="button"
        class="emoji-option"
        :class="{ selected: option === emoji }"
        :aria-pressed="option === emoji"
        @click="pick(option)"
      >
        {{ option }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Anchors the popup under the cover
.emoji-cover-picker {
  position: relative;
  display: flex;
  justify-content: center;
}

.cover {
  position: relative;
  width: 132px;
  height: 132px;
  border-radius: 28px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  font-family: inherit;
  cursor: pointer;
  transition:
    transform 0.15s,
    border-color 0.15s;
}

.cover:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.cover:active {
  transform: scale(0.97);
}

.cover-emoji {
  font-size: 64px;
  line-height: 1;
}

.cover-badge {
  position: absolute;
  right: -8px;
  bottom: -8px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #ffffff;
  color: #0d0d0d;
  border: 3px solid #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-badge svg {
  width: 14px;
  height: 14px;
}

.emoji-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
}

// Floats over the fields below instead of pushing them down
.emoji-grid {
  position: absolute;
  top: calc(100% + 12px);
  left: 50%;
  z-index: 21;
  display: grid;
  grid-template-columns: repeat(8, 28px);
  gap: 2px;
  padding: 8px;
  border-radius: 14px;
  background: #1f1f1f;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);
  transform: translateX(-50%);
  animation: pop-in 0.15s ease-out;
}

.emoji-option {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
  border-radius: 8px;
  border: 1.5px solid transparent;
  background: transparent;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.emoji-option:hover {
  background: rgba(255, 255, 255, 0.06);
}

.emoji-option.selected {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.35);
}

@keyframes pop-in {
  from {
    opacity: 0;
    transform: translate(-50%, -6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0) scale(1);
  }
}
</style>
