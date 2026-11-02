<script setup lang="ts">
import GarageArtworkTile from './GarageArtworkTile.vue';

const names = ['button-back','button-coming-soon','button-garage','button-nitro','button-play','button-retry',
  'hud-brake','hud-combo','hud-drift','hud-nitro','hud-pause','hud-speed',
  'ui-arrow-left','ui-arrow-right','ui-close','ui-info','ui-settings','ui-tooltip'];
const wide = (name: string): boolean => name.startsWith('button-');
const src = (name: string): string =>
  `${import.meta.env.BASE_URL}feature-assets/mobile-controls-hud/raster/${name}@3x.webp`;
</script>

<template>
  <details id="hud-3x-source-gallery" class="hud-art-preview">
    <summary data-i18n="hudArt.title">UI 3× artwork</summary>
    <p data-i18n="hudArt.note">Source preview only · it does not change the HUD layout or any button.</p>
    <div class="hud-art-grid">
      <GarageArtworkTile v-for="name in names" :key="name" :id="name"
        :label="name.replaceAll('-', ' ')" :src="src(name)"
        :size="wide(name) ? 144 : 72" :image-height="wide(name) ? 52 : 72"
        :tone="wide(name) ? 'gold' : 'cyan'" />
    </div>
  </details>
</template>

<style scoped>
.hud-art-preview { border-top: 1px solid #506887; margin-top: 15px; padding-top: 10px; min-width: 0; }
.hud-art-preview summary { min-height: 44px; font-size: 12px; font-weight: 700; cursor: pointer; color: #d7ecff; }
.hud-art-preview p { font-size: 12px; line-height: 1.4; color: #a5c4df; }
.hud-art-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 184px), 1fr));
  gap: 10px; align-items: stretch; }
</style>
