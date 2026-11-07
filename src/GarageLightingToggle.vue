<script setup lang="ts">
import { computed } from 'vue';
import { garageStudioView } from './garage-view-state.ts';

// garage-ui.ts owns the click (state + world); this component only renders the sun/moon toggle.
const props = defineProps<{ locale: string }>();
const dim = computed(() => garageStudioView.lighting === 'dim');
const label = computed(() => props.locale === 'zh-TW' ? '暗色燈光' : 'Dim lighting');
const title = computed(() => props.locale === 'zh-TW'
  ? (dim.value ? '切換為明亮燈光' : '切換為暗色燈光')
  : (dim.value ? 'Switch to bright lighting' : 'Switch to dim lighting'));
</script>

<template>
  <button type="button" id="garage-lighting" class="garage-lighting" :aria-pressed="dim" :aria-label="label" :title="title"
    :data-lighting="garageStudioView.lighting">
    <svg v-if="dim" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></svg>
    <svg v-else viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></svg>
  </button>
</template>

<style>
#garage-screen .garage-mode-controls #garage-lighting { flex: none; display: grid; place-items: center; width: 44px; min-width: 44px; height: 44px; padding: 0; color: #ffd27a; }
#garage-screen .garage-mode-controls #garage-lighting svg { width: 22px; height: 22px; fill: currentColor; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
#garage-screen .garage-mode-controls #garage-lighting[aria-pressed="true"] { color: #e4e8ff; background: linear-gradient(140deg, #26306b, #4a3f8f); border-color: #8f8cf0; box-shadow: 0 0 14px #6f6cf055; }
</style>
