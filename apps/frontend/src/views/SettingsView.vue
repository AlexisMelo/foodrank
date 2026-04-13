<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { User } from '@/types/restaurant'
import { fetchUserById } from '@/services/restaurantService'
import { useAuth } from '@/composables/useAuth'
import { supabase } from '@/supabaseClient'

const { currentUserId: CURRENT_USER_ID } = useAuth()
const router = useRouter()

const currentUser = ref<User | null>(null)

onMounted(async () => {
  const [user] = await Promise.all([fetchUserById(CURRENT_USER_ID)])
  currentUser.value = user ?? null
})

async function logout() {
  await supabase.auth.signOut()
  router.replace('/')
}
</script>

<template>
  <div class="settings">
    <div class="blob blob-1" />
    <div class="blob blob-2" />

    <div class="header">
      <button class="back-btn" @click="router.back()">←</button>
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

.blob {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}
.blob-1 {
  width: 200px;
  height: 200px;
  background: rgba(199, 125, 255, 0.08);
  top: -60px;
  right: -60px;
}
.blob-2 {
  width: 140px;
  height: 140px;
  background: rgba(76, 201, 240, 0.07);
  bottom: 20%;
  left: -40px;
}

.header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
}

.back-btn {
  position: absolute;
  left: 0;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.back-btn:hover {
  background: rgba(255, 255, 255, 0.1);
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
