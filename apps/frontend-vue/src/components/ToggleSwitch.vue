<script setup lang="ts">
/** On / off state */
const checked = defineModel<boolean>({ required: true })

defineProps<{
  /** What the switch turns on */
  label: string
  /** Explanation under the label */
  hint?: string
}>()
</script>

<template>
  <!-- A native checkbox with the switch role: keyboard and screen readers work out of the box -->
  <label class="toggle-switch">
    <span class="texts">
      <span class="label">{{ label }}</span>
      <span v-if="hint" class="hint">{{ hint }}</span>
    </span>
    <input v-model="checked" type="checkbox" role="switch" class="input" />
    <span class="track" aria-hidden="true" />
  </label>
</template>

<style scoped lang="scss">
.toggle-switch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, 0.07);
  cursor: pointer;
}

.texts {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
}

.hint {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
}

// Hidden but still focusable: the track below is its visual
.input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.track {
  position: relative;
  width: 44px;
  height: 26px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
  transition: background 0.2s;
}

.track::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  transition:
    transform 0.2s,
    background 0.2s;
}

.input:checked + .track {
  background: #ffffff;
}

.input:checked + .track::after {
  transform: translateX(18px);
  background: #0d0d0d;
}

.input:focus-visible + .track {
  outline: 2px solid rgba(255, 255, 255, 0.6);
  outline-offset: 2px;
}
</style>
