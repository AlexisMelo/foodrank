<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import PageTopBar from '@/components/PageTopBar.vue'
import EmojiCoverPicker from '@/components/EmojiCoverPicker.vue'
import ToggleSwitch from '@/components/ToggleSwitch.vue'
import { createTierlist } from '@/services/tierlistService'
import {
  DEFAULT_TIERLIST_EMOJI,
  TIERLIST_DESCRIPTION_MAX_LENGTH,
  TIERLIST_EMOJIS,
  TIERLIST_NAME_MAX_LENGTH,
} from '@/utils/tierlist'

const router = useRouter()

const emoji = shallowRef<string>(DEFAULT_TIERLIST_EMOJI)
const name = shallowRef('')
const description = shallowRef('')
const pinned = shallowRef(false)
const saving = shallowRef(false)
const saveError = shallowRef<string | null>(null)

// The description is optional and the emoji has a default value: only the name must be filled
const isValid = computed(() => emoji.value !== '' && name.value.trim() !== '')

/**
 * Message shown when creating the tierlist failed, depending on the API answer
 */
function saveErrorMessage(error: unknown) {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined
  if (status === 401) return 'Log in to create a tierlist.'
  return 'Could not create your tierlist, try again.'
}

/**
 * Create the tierlist, then go back to the tierlists page
 */
async function submit() {
  if (!isValid.value || saving.value) return
  saving.value = true
  saveError.value = null
  try {
    await createTierlist({
      emoji: emoji.value,
      name: name.value.trim(),
      description: description.value.trim() || null,
      pinned: pinned.value,
    })
    // Replace: going back from the tierlists page must not reopen the submitted form
    router.replace('/tierlists')
  } catch (error) {
    saveError.value = saveErrorMessage(error)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- novalidate: the Create button stays disabled until the form is valid, no browser bubbles needed -->
  <form class="tierlist-create-view" novalidate @submit.prevent="submit">
    <PageTopBar title="Create a tierlist" back-to="/tierlists">
      <button type="submit" class="create-btn" :disabled="!isValid || saving">
        {{ saving ? 'Creating...' : 'Create' }}
      </button>
    </PageTopBar>

    <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>

    <EmojiCoverPicker v-model="emoji" :options="TIERLIST_EMOJIS" class="cover-picker" />

    <div class="field">
      <label for="tierlist-name" class="field-label">Name</label>
      <input
        id="tierlist-name"
        v-model="name"
        type="text"
        class="field-input"
        placeholder="My best burgers"
        autocomplete="off"
        required
        :maxlength="TIERLIST_NAME_MAX_LENGTH"
      />
    </div>

    <div class="field">
      <label for="tierlist-description" class="field-label">
        Description <span class="optional">(optional)</span>
      </label>
      <textarea
        id="tierlist-description"
        v-model="description"
        class="field-input description-input"
        rows="3"
        placeholder="What brings these places together?"
        :maxlength="TIERLIST_DESCRIPTION_MAX_LENGTH"
      />
      <span class="counter">{{ description.length }}/{{ TIERLIST_DESCRIPTION_MAX_LENGTH }}</span>
    </div>

    <ToggleSwitch
      v-model="pinned"
      label="Pin to profile"
      hint="Show this tierlist on your profile"
    />
  </form>
</template>

<style scoped lang="scss">
.tierlist-create-view {
  min-height: 100dvh;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  // Keeps the last field above the bottom tab bar
  padding-bottom: 96px;
}

.create-btn {
  padding: 8px 18px;
  border-radius: 100px;
  border: none;
  background: #ffffff;
  color: #0d0d0d;
  font-size: 14px;
  font-weight: 800;
  font-family: inherit;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s,
    opacity 0.15s;
}

.create-btn:hover {
  opacity: 0.9;
}

.create-btn:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: default;
  opacity: 1;
}

.save-error {
  margin: -12px 0 16px;
  font-size: 13px;
  font-weight: 700;
  color: #ff6b6b;
  text-align: center;
}

.cover-picker {
  margin-bottom: 28px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.optional {
  text-transform: none;
  letter-spacing: 0;
  font-weight: 600;
}

.field-input {
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  background: #161616;
  color: #ffffff;
  // 16px at least, or iOS zooms on the page when the field gets the focus
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
}

.field-input::placeholder {
  color: rgba(255, 255, 255, 0.25);
}

.field-input:focus {
  border-color: rgba(255, 255, 255, 0.35);
}

.description-input {
  font-weight: 600;
  line-height: 1.4;
  resize: none;
}

.counter {
  align-self: flex-end;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.3);
}
</style>
