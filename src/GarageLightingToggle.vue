<script setup lang="ts">
import CollectibleIcon from './CollectibleIcon.vue';
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
    <CollectibleIcon :name="dim ? 'moon' : 'sun'" />
  </button>
</template>

<style>
#garage-screen .garage-mode-controls #garage-lighting { flex: none; display: grid; place-items: center; width: 44px; min-width: 44px; height: 44px; padding: 0; color: #ffd27a; }
#garage-screen .garage-mode-controls #garage-lighting[aria-pressed="true"] { color: #e4e8ff; background: linear-gradient(140deg, #26306b, #4a3f8f); border-color: #8f8cf0; box-shadow: 0 0 14px #6f6cf055; }
</style>
