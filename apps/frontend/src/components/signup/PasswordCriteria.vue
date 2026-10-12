<script setup lang="ts">
import { computed } from 'vue'
import { passwordCriteria } from '@/utils/signup'

const props = defineProps<{
  /** Password being typed */
  password: string
}>()

const criteria = computed(() => passwordCriteria(props.password))
</script>

<template>
  <ul class="criteria" aria-label="Password requirements">
    <li
      v-for="criterion in criteria"
      :key="criterion.label"
      class="criterion"
      :class="{ met: criterion.met }"
    >
      <span class="criterion-icon">{{ criterion.met ? '✓' : '•' }}</span>
      {{ criterion.label }}
    </li>
  </ul>
</template>

<style scoped lang="scss">
.criteria {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 2px 0 4px;
}

.criterion {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.4);
  transition: color 0.2s;

  &.met {
    color: #90be6d;
  }
}

.criterion-icon {
  width: 14px;
  text-align: center;
  font-weight: 900;
}
</style>
