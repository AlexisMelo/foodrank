<script setup lang="ts">
import { computed, onMounted, shallowRef, useTemplateRef } from 'vue'
import axios from 'axios'
import { useAuth } from '@/composables/useAuth'

const emit = defineEmits<{
  close: []
}>()

const { deleteAccount } = useAuth()

const password = shallowRef('')
const loading = shallowRef(false)
const error = shallowRef('')
const passwordInput = useTemplateRef<HTMLInputElement>('passwordInput')

const canConfirm = computed(() => password.value !== '' && !loading.value)

onMounted(() => passwordInput.value?.focus())

function cancel() {
  if (!loading.value) emit('close')
}

/**
 * Delete the account; on success useAuth opens the login page, which removes this popup
 */
async function confirm() {
  if (!canConfirm.value) return
  error.value = ''
  loading.value = true
  try {
    await deleteAccount(password.value)
  } catch (e) {
    // 403: the API refused the password, the user stays logged in and can try again
    error.value =
      axios.isAxiosError(e) && e.response?.status === 403
        ? 'Incorrect password.'
        : 'Your account could not be deleted. Please try again later.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <!-- Teleported so the fixed overlay never depends on the page's stacking context -->
  <Teleport to="body">
    <Transition name="fade" appear>
      <div class="overlay" @click.self="cancel" @keydown.esc="cancel">
        <form
          class="dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
          @submit.prevent="confirm"
        >
          <h2 id="delete-account-title" class="title">Delete your account?</h2>
          <p class="text">
            Your profile, ratings and tierlists will be permanently deleted. This cannot be undone.
          </p>

          <label class="label" for="delete-account-password">Enter your password to confirm</label>
          <input
            id="delete-account-password"
            ref="passwordInput"
            v-model="password"
            class="input"
            type="password"
            placeholder="Your password"
            autocomplete="current-password"
            :disabled="loading"
            required
          />

          <p v-if="error" class="error">{{ error }}</p>

          <div class="actions">
            <button class="cancel-btn" type="button" :disabled="loading" @click="cancel">
              Cancel
            </button>
            <button class="delete-btn" type="submit" :disabled="!canConfirm">
              {{ loading ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </form>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.dialog {
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 20px 20px;
  background: #161616;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  color: #ffffff;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 800;
}

.text {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.55);
}

.label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.3px;
}

.input {
  width: 100%;
  background: #111111;
  border: 1.5px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
  color: #ffffff;
  font-size: 15px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
  &:focus {
    border-color: rgba(255, 255, 255, 0.35);
  }
  &:disabled {
    opacity: 0.5;
  }
}

.error {
  margin: 0;
  font-size: 12px;
  color: #ff6b6b;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
}

.cancel-btn,
.delete-btn {
  flex: 1;
  padding: 13px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition:
    opacity 0.2s,
    background 0.2s;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  border: none;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.14);
  }
}

.delete-btn {
  background: #ff6b6b;
  color: #0d0d0d;
  border: none;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }
}

.fade-enter-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from {
  opacity: 0;
}
</style>
