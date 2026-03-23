<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useNewReview } from '@/composables/useNewReview'
import { fetchRestaurants } from '@/services/restaurantService'
import type { Restaurant } from '@/types/restaurant'

const router = useRouter()

function submitSearch() {
  const trimmed = query.value.trim()
  if (!trimmed) return
  close()
  router.push({ path: '/search', query: { q: trimmed } })
}

const { isOpen, close } = useNewReview()

const query = ref('')
const searchInput = ref<HTMLInputElement | null>(null)
const suggestions = ref<Restaurant[]>([])
const loading = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastSearched = ''

watch(query, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)

  const trimmed = val.trim()

  if (trimmed.length < 3) {
    suggestions.value = []
    return
  }

  debounceTimer = setTimeout(async () => {
    if (trimmed === lastSearched) return
    lastSearched = trimmed
    loading.value = true
    const all = await fetchRestaurants()
    const lower = trimmed.toLowerCase()
    suggestions.value = all.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.cuisine.toLowerCase().includes(lower) ||
        r.tags.some((t) => t.toLowerCase().includes(lower)),
    )
    loading.value = false
  }, 500)
})

watch(isOpen, async (val) => {
  if (val) {
    await nextTick()
    searchInput.value?.focus()
  } else {
    query.value = ''
    suggestions.value = []
    lastSearched = ''
  }
})
</script>

<template>
  <Transition name="sheet">
    <div v-if="isOpen" class="overlay" @click.self="close">
      <div class="sheet">
        <div class="header">
          <h2 class="title">New review</h2>
          <button class="close-btn" @click="close">✕</button>
        </div>

        <div class="search-row">
          <input
            ref="searchInput"
            v-model="query"
            class="search-input"
            type="text"
            placeholder="Search a restaurant…"
            @keydown.enter="submitSearch"
          />
          <button class="search-btn" @click="submitSearch">🔍</button>
        </div>

        <!-- Suggestions — rendered outside the flow of search-row -->
        <div class="suggestions-area">
          <div v-if="loading" class="hint">Searching…</div>
          <div v-else-if="query.trim().length >= 3 && suggestions.length === 0" class="hint">
            No restaurants found
          </div>
          <ul v-else-if="suggestions.length" class="suggestions">
            <li v-for="r in suggestions" :key="r.id" class="suggestion-item">
              <span class="suggestion-emoji">{{ r.emoji }}</span>
              <div class="suggestion-info">
                <span class="suggestion-name">{{ r.name }}</span>
                <span class="suggestion-meta">{{ r.cuisine }}</span>
              </div>
            </li>
          </ul>
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
  align-items: flex-start;
  max-width: 420px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
}

.sheet {
  width: 100%;
  background: #161616;
  border-radius: 0 0 24px 24px;
  padding: 56px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
.search-btn:hover { transform: scale(1.06); }
.search-btn:active { transform: scale(0.96); }

.suggestions-area {
  margin-top: 0;
}

.hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.35);
  text-align: center;
  padding: 4px 0 8px;
}

.suggestions {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: -8px;
}

.suggestion-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 12px;
  border-radius: 14px;
  cursor: pointer;
  transition: background 0.15s;
}
.suggestion-item:hover {
  background: rgba(255, 255, 255, 0.07);
}

.suggestion-emoji {
  font-size: 26px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  flex-shrink: 0;
}

.suggestion-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.suggestion-meta {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  font-weight: 600;
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
  transform: translateY(-100%);
}
</style>
