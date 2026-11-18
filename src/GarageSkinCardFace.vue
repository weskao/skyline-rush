<script setup lang="ts">
import { computed } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import { findSkin, skinArtwork } from './garage-skin-catalog.ts';
import type { SkinId } from './garage-skin-catalog.ts';

const props = defineProps<{ skinId: SkinId; locale: string }>();
const base = import.meta.env.BASE_URL;
const artwork = computed(() => skinArtwork(props.skinId, base));
const skin = computed(() => findSkin(props.skinId));
const title = computed(() => skin.value?.name[props.locale === 'zh-TW' ? 'zh-TW' : 'en'] ?? '');
// Drift cards use the same poster as the live drift preview, which opens on demand.
const animatedSrc = computed(() => skin.value && skin.value.category !== 'drift-trail'
  ? base + 'feature-assets/garage-animated/' + skin.value.id + '@3x.gif' : '');
</script>

<template>
  <span v-if="artwork" class="garage-vfx-art">
    <GarageArtworkImage :src="artwork.src" :fallback-src="artwork.hasRaster ? artwork.fallback : ''"
      :animated-src="animatedSrc" :size="artwork.cssSize" alt="" :fallback-text="title"
      fallback-class="garage-vfx-fallback" />
  </span>
  <strong class="garage-skin-card-name">{{ title }}</strong>
</template>

<style scoped>
.garage-vfx-art {
  position: relative; box-sizing: border-box; display: grid; place-items: center;
  width: 112px; height: 112px; max-width: 100%; padding: 8px; border-radius: 13px;
  background: radial-gradient(circle, hsl(var(--card-hue, 202) 74% 44% / .19), transparent 73%);
  pointer-events: none;
}
.garage-vfx-art :deep(.artwork-img) {
  filter: drop-shadow(0 0 5px hsl(var(--card-hue, 202) 85% 64% / .34));
}
.garage-vfx-art :deep(.garage-vfx-fallback) { color: #c4e7f0; font-size: 12px; }
.garage-skin-card-name {
  padding: 0 4px; color: #ecf6ff; font-size: 12px; font-weight: 750;
  line-height: 1.3; overflow-wrap: anywhere; pointer-events: none;
}
</style>
