<script setup lang="ts">
import { ref } from 'vue';
import { GARAGE_SKINS, SKIN_CATEGORIES, SKIN_PREVIEW_UI, skinArtwork } from './garage-skin-catalog.ts';
import type { SkinCategory } from './garage-skin-catalog.ts';

defineProps<{ locale: string }>();

const categoryNames: Record<SkinCategory, { en: string; 'zh-TW': string }> = {
  thruster: { en: 'Thruster', 'zh-TW': '推進器' },
  airflow: { en: 'Airflow', 'zh-TW': '氣流' },
  'nitro-trail': { en: 'NITRO trail', 'zh-TW': '氮氣尾跡' },
  'launch-flare': { en: 'Launch flare', 'zh-TW': '起跑閃焰' },
};
const entries = GARAGE_SKINS.map(skin => ({ ...skin, artwork: skinArtwork(skin.id, import.meta.env.BASE_URL)! }));
const unavailable = ref<ReadonlySet<string>>(new Set());
function onImageError(id: string): void {
  unavailable.value = new Set([...unavailable.value, id]);
}
</script>

<template>
  <!-- Phase A is deliberately read-only: not a fake Three.js preview or trial/equip implementation. -->
  <section id="garage-vfx-catalog" class="garage-vfx-catalog" data-preview-contract="contract-only"
    aria-labelledby="garage-vfx-catalog-heading">
    <h3 id="garage-vfx-catalog-heading">{{ locale === 'zh-TW' ? '外觀特效收藏' : 'VFX collection' }}</h3>
    <p class="garage-vfx-message">{{ SKIN_PREVIEW_UI.placeholderText[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</p>
    <div v-for="category in SKIN_CATEGORIES" :key="category" class="garage-vfx-category">
      <h4>{{ categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
      <ul>
        <li v-for="skin in entries.filter(entry => entry.category === category)" :key="skin.id"
          :data-skin="skin.id" :data-state="skin.default ? 'default' : 'locked'">
          <span class="garage-vfx-art">
            <img v-if="!unavailable.has(skin.id)" :src="skin.artwork.src" :width="skin.artwork.cssSize"
              :height="skin.artwork.cssSize" alt="" decoding="async" @error="onImageError(skin.id)" />
            <span v-else class="garage-vfx-fallback" aria-hidden="true">
              {{ categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}
            </span>
          </span>
          <strong>{{ skin.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
          <small>{{ skin.default ? (locale === 'zh-TW' ? '預設' : 'Default') : (locale === 'zh-TW' ? '尚未開放' : 'Coming soon') }}</small>
        </li>
      </ul>
    </div>
    <p class="garage-vfx-message">{{ locale === 'zh-TW' ? '此處僅展示分類與素材，尚未提供試用或裝備。' : 'Catalog and artwork only; trial and equip are not active yet.' }}</p>
  </section>
</template>

<style scoped>
.garage-vfx-catalog { border-top: 1px solid #35536a; margin-top: 14px; padding-top: 10px; }
.garage-vfx-catalog h3 { margin: 0 0 6px; font-size: 15px; }
.garage-vfx-message { font-size: 12px; line-height: 1.45; color: #c2d4e3; margin: 6px 0 10px; }
.garage-vfx-category { margin: 12px 0; }
.garage-vfx-category h4 { font-size: 13px; margin: 0 0 6px; }
.garage-vfx-category ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(105px, 1fr)); gap: 8px; padding: 0; margin: 0; list-style: none; }
.garage-vfx-category li { display: flex; flex-direction: column; gap: 3px; min-width: 0; align-items: center; padding: 7px; border-radius: 8px; border: 1px solid #31536a; background: #112638; text-align: center; }
.garage-vfx-art { width: 96px; height: 96px; max-width: 100%; display: grid; place-items: center; }
.garage-vfx-art img { width: 100%; height: 100%; object-fit: contain; }
.garage-vfx-fallback { color: #c4e7f0; font-size: 12px; overflow-wrap: anywhere; }
.garage-vfx-category strong { font-size: 12px; overflow-wrap: anywhere; }
.garage-vfx-category small { font-size: 11px; color: #a1c6d8; }
@media (max-height: 420px) and (orientation: landscape) { .garage-vfx-category ul { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .garage-vfx-catalog * { animation: none !important; transition: none !important; } }
</style>
