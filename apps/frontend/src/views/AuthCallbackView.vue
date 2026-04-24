<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const router = useRouter()
const { setLoggedIn } = useAuth()

onMounted(async () => {
  const params = new URLSearchParams(window.location.hash.substring(1))
  const accessToken = params.get('access_token')

  if (!accessToken) {
    router.replace('/?error=invalid_token')
    return
  }

  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ accessToken }),
  })

  if (res.ok) {
    setLoggedIn(true)
    router.replace('/')
  } else {
    router.replace('/?error=invalid_token')
  }
})
</script>

<template>
  <div class="callback">
    <p>Signing you in…</p>
  </div>
</template>

<style scoped>
.callback {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 14px;
}
</style>
