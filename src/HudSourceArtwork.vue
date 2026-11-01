<script setup lang="ts">
import { ref } from 'vue';
const names = ["button-back","button-coming-soon","button-garage","button-nitro","button-play","button-retry","hud-brake","hud-combo","hud-drift","hud-nitro","hud-pause","hud-speed","ui-arrow-left","ui-arrow-right","ui-close","ui-info","ui-settings","ui-tooltip"];
const failed = ref<ReadonlySet<string>>(new Set());
const wide = (name: string) => name.startsWith('button-');
const src = (name: string) =>
  `${import.meta.env.BASE_URL}feature-assets/mobile-controls-hud/raster/${name}@3x.webp`;
const onError = (name: string) => { failed.value = new Set([...failed.value, name]); };
</script>

<template>
  <details id="hud-3x-source-gallery" class="hud-art-preview">
    <summary>UI 3× Artwork / 操作圖示素材</summary>
    <p>Source preview only · 素材展示不改變既有 HUD 配置或按鈕功能。</p>
    <div class="hud-art-grid">
      <figure v-for="name in names" :key="name" :data-art="name">
        <img v-if="!failed.has(name)" :data-image="name" :src="src(name)"
          :width="wide(name) ? 144 : 72" :height="wide(name) ? 52 : 72"
          :alt="name.replaceAll('-', ' ')" loading="lazy" decoding="async"
          @error="onError(name)" />
        <span v-else role="img" :aria-label="name.replaceAll('-', ' ')">{{ name }}</span>
        <figcaption>{{ name.replaceAll('-', ' ') }}</figcaption>
      </figure>
    </div>
  </details>
</template>

<style scoped>
.hud-art-preview { border-top: 1px solid #506887; margin-top: 15px; padding-top: 10px; }
.hud-art-preview summary { min-height: 44px; font-size: 12px; font-weight: bold; cursor: pointer; color: #d7ecff; }
.hud-art-preview p { font-size: 12px; line-height: 1.4; color: #a5c4df; }
.hud-art-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(156px, 1fr)); gap: 9px; }
.hud-art-grid figure { display: flex; min-height: 118px; flex-direction: column; justify-content: center;
  align-items: center; gap: 8px; margin: 0; padding: 8px 5px; border: 1px solid #284b70;
  border-radius: 9px; background: radial-gradient(circle, #253d5e, #0b1525); }
.hud-art-grid img { display: block; max-width: 100%; object-fit: contain; }
.hud-art-grid figcaption { font-size: 10px; text-align: center; color: #cee0ed; overflow-wrap: anywhere; }
</style>
