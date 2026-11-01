<script setup lang="ts">
import { ref } from 'vue';
import { GARAGE_SKINS, SKIN_CATEGORIES, skinArtwork } from './garage-skin-catalog.ts';
import { garageSkinState, garageSkinEntry, selectGarageSkin, equipGarageSkin } from './garage-skin-runtime.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { GARAGE_RELEASE_MODE } from '#garage-release-config';

defineProps<{ locale: string }>();

const categoryNames: Record<SkinCategory, { en: string; 'zh-TW': string }> = {
  thruster: { en: 'Thruster', 'zh-TW': '推進器' },
  airflow: { en: 'Airflow', 'zh-TW': '氣流' },
  'nitro-trail': { en: 'NITRO trail', 'zh-TW': '氮氣尾跡' },
  'launch-flare': { en: 'Launch flare', 'zh-TW': '起跑閃焰' },
};
const entries = GARAGE_SKINS.map(skin => ({ ...skin, artwork: skinArtwork(skin.id, import.meta.env.BASE_URL)! }));
const unavailable = ref<ReadonlySet<string>>(new Set());
const rasterFailed = ref<ReadonlySet<string>>(new Set());
const view = (id: SkinId) => { void garageSkinState.revision; return garageSkinEntry(id); };
const statusText = (id: SkinId, locale: string) => {
  const state = view(id)?.state ?? 'locked';
  return ({ en: { trial: 'Free trial', equipped: 'Equipped', owned: 'Owned', locked: 'Locked' },
    'zh-TW': { trial: '免費試用', equipped: '已裝備', owned: '已擁有', locked: '未解鎖' } } as const)[locale === 'zh-TW' ? 'zh-TW' : 'en'][state];
};
function onImageError(id: string, hasRaster: boolean): void {
  if (hasRaster && !rasterFailed.value.has(id)) {
    rasterFailed.value = new Set([...rasterFailed.value, id]);
  } else {
    unavailable.value = new Set([...unavailable.value, id]);
  }
}
</script>

<template>
  <!-- The trial/equip action passes through the session-only entitlement controller. -->
  <section id="garage-vfx-catalog" class="garage-vfx-catalog" data-preview-contract="live-shared-aero" :data-release-mode="GARAGE_RELEASE_MODE"
    aria-labelledby="garage-vfx-catalog-heading">
    <h3 id="garage-vfx-catalog-heading">{{ locale === 'zh-TW' ? '外觀特效收藏' : 'VFX collection' }}</h3>
    <p class="garage-vfx-message">{{ GARAGE_RELEASE_MODE === 'trial' ? (locale === 'zh-TW' ? '預覽不會解鎖外觀。免費試用不會成為永久擁有。' : 'Preview does not unlock skins. Free trials are not permanent ownership.') : (locale === 'zh-TW' ? '預覽不會解鎖外觀。裝備需要有效擁有權。' : 'Preview does not unlock skins. Equip requires ownership.') }}</p>
    <div v-for="category in SKIN_CATEGORIES" :key="category" class="garage-vfx-category">
      <h4>{{ categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
      <ul>
        <li v-for="skin in entries.filter(entry => entry.category === category)" :key="skin.id"
          :data-skin="skin.id" :data-state="view(skin.id)?.state" :data-owned="String(view(skin.id)?.owned ?? false)">
          <span class="garage-vfx-art">
            <img v-if="!unavailable.has(skin.id)" :src="rasterFailed.has(skin.id) ? skin.artwork.fallback : skin.artwork.src" :width="skin.artwork.cssSize"
              :height="skin.artwork.cssSize" alt="" decoding="async" @error="onImageError(skin.id, skin.artwork.hasRaster)" />
            <span v-else class="garage-vfx-fallback" aria-hidden="true">
              {{ categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}
            </span>
          </span>
          <strong>{{ skin.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
          <small>{{ statusText(skin.id, locale) }}</small>
          <div class="garage-vfx-actions">
            <button type="button" @click="selectGarageSkin(skin.id)">{{ locale === 'zh-TW' ? '預覽' : 'Preview' }}</button>
            <button type="button" :disabled="!view(skin.id)?.canEquip" @click="equipGarageSkin(skin.id)">
              {{ view(skin.id)?.owned ? (locale === 'zh-TW' ? '裝備' : 'Equip') : GARAGE_RELEASE_MODE === 'trial' ? (locale === 'zh-TW' ? '試用' : 'Try') : (locale === 'zh-TW' ? '未解鎖' : 'Locked') }}
            </button>
          </div>
        </li>
      </ul>
    </div>
    <p class="garage-vfx-message" role="status">{{ locale === 'zh-TW' ? '特效僅改變外觀，不影響速度、獎勵或舊有車漆。' : 'Cosmetics only. Speed, rewards and existing paints are unchanged.' }}</p>
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
.garage-vfx-actions { display: flex; flex-wrap: wrap; width: 100%; gap: 5px; justify-content: center; }
.garage-vfx-actions button { flex: 1 1 45%; min-height: 44px; border-radius: 6px; border: 1px solid #4f8caa; color: #e8f3fb; background: #143950; font-size: 12px; cursor: pointer; }
.garage-vfx-actions button:disabled { opacity: .55; cursor: default; }
.garage-vfx-actions button:focus-visible { outline: 3px solid #67e8ff; outline-offset: 2px; }
@media (max-height: 420px) and (orientation: landscape) { .garage-vfx-category ul { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .garage-vfx-catalog * { animation: none !important; transition: none !important; } }
</style>
