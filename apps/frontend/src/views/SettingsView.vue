<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'
import { useUserProfile } from '@/composables/useUserProfile'
import UserBar from '@/components/UserBar.vue'

const { logout } = useAuth()
const { profile } = useUserProfile()
</script>

<template>
  <div class="settings">
    <div class="header">
      <h1 class="title">Settings</h1>
    </div>

    <!-- Log out stays available even if the profile could not be loaded -->
    <div class="bottom-section">
      <UserBar v-if="profile" :profile="profile" class="settings-user-bar" />
      <button class="logout-btn" @click="logout">Log out</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.settings {
  min-height: 100dvh;
  color: #ffffff;
  overflow: hidden;
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

.settings-user-bar {
  width: 100%;
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
