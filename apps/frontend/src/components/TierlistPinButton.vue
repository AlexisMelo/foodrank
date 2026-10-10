<script setup lang="ts">
defineProps<{
  /** Pinned to its owner's profile */
  pinned: boolean
  /** A change is being saved: the button is disabled meanwhile */
  saving?: boolean
}>()

defineEmits<{
  /** The user asks to pin, or unpin, the tierlist */
  toggle: []
}>()
</script>

<template>
  <button
    class="pin-btn"
    :class="{ pinned }"
    :aria-pressed="pinned"
    :disabled="saving"
    @click="$emit('toggle')"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path
        d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"
      />
    </svg>
    {{ pinned ? 'Pinned to profile' : 'Pin to profile' }}
  </button>
</template>

<style scoped lang="scss">
.pin-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1.5px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s,
    color 0.15s,
    opacity 0.15s;
}

.pin-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.pin-btn svg {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
}

.pin-btn.pinned {
  background: #ffffff;
  border-color: #ffffff;
  color: #0d0d0d;
}
</style>
