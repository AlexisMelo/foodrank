<script setup lang="ts">
import { ref } from 'vue'
import { useNewReview } from '@/composables/useNewReview'

const { isOpen, close } = useNewReview()
const query = ref('')
</script>

<template>
  <Transition name="sheet">
    <div v-if="isOpen" class="overlay" @click.self="close">
      <div class="sheet">
        <div class="handle" />

        <div class="header">
          <h2 class="title">New review</h2>
          <button class="close-btn" @click="close">✕</button>
        </div>

        <div class="search-row">
          <input
            v-model="query"
            class="search-input"
            type="text"
            placeholder="Search a restaurant…"
            autofocus
          />
          <button class="search-btn">🔍</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  max-width: 420px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
}

.sheet {
  width: 100%;
  background: #161616;
  border-radius: 24px 24px 0 0;
  padding: 12px 20px 40px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.handle {
  width: 36px;
  height: 4px;
  border-radius: 100px;
  background: rgba(255, 255, 255, 0.15);
  align-self: center;
  margin-bottom: 4px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title {
  font-size: 20px;
  font-weight: 800;
  color: #ffffff;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.close-btn:hover {
  background: rgba(255, 255, 255, 0.14);
}

.search-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.search-input {
  flex: 1;
  height: 46px;
  border-radius: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  background: #1e1e1e;
  color: #ffffff;
  font-size: 15px;
  font-family: inherit;
  font-weight: 600;
  padding: 0 16px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
  font-weight: 500;
}
.search-input:focus {
  border-color: rgba(255, 255, 255, 0.3);
}

.search-btn {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  border: none;
  background: #ffffff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.15s;
}
.search-btn:hover {
  transform: scale(1.06);
}
.search-btn:active {
  transform: scale(0.96);
}

/* Transition */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.25s ease;
}
.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}
.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  transform: translateY(100%);
}
</style>
