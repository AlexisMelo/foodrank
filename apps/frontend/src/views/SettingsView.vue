<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from '@/types/restaurant'
import { fetchUserById } from '@/services/restaurantService'
import { useAuth } from '@/composables/useAuth'

const { currentUserId: CURRENT_USER_ID, setLoggedIn } = useAuth()
const router = useRouter()

const currentUser = ref<User | null>(null)

onMounted(async () => {
  const [user] = await Promise.all([fetchUserById(CURRENT_USER_ID)])
  currentUser.value = user ?? null
})

async function logout() {
  const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })

  if (res.ok) {
    setLoggedIn(false)
  } else {
    alert('Failed to log out. Please try again.')
  }
}
</script>

<template>
  <div class="settings">
    <div class="header">
      <h1 class="title">Settings</h1>
    </div>

    <div v-if="currentUser" class="bottom-section">
      <button class="user-bar" @click="router.push('/profile')">
        <span class="user-avatar">{{ currentUser.avatar }}</span>
        <span class="user-name">{{ currentUser.name }}</span>
      </button>
      <button class="logout-btn" @click="logout">Log out</button>
    </div>
  </div>
</template>

<style scoped>
.settings {
  position: relative;
  min-height: 100dvh;
  background-color: #0d0d0d;
  color: #ffffff;
  overflow: hidden;
  padding: 40px 20px;
  font-family: 'Nunito', 'Poppins', system-ui, sans-serif;
  display: flex;
  flex-direction: column;
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.3px;
  margin: 0;
}

.bottom-section {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 16px;
}

.user-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  background: #1a1a1a;
  border: 1.5px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 10px 14px;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
  text-align: left;
  transition: background 0.2s;
}
.user-bar:hover {
  background: #222;
}

.user-avatar {
  font-size: 24px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 800;
  color: #ffffff;
  flex: 1;
}

.user-visited {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  white-space: nowrap;
}

.logout-btn {
  margin: auto;
  width: 70%;
  padding: 13px;
  background: transparent;
  color: #ff6b6b;
  border: 1.5px solid rgba(255, 107, 107, 0.35);
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s;
}
.logout-btn:hover {
  background: rgba(255, 107, 107, 0.08);
  border-color: rgba(255, 107, 107, 0.6);
}
</style>
