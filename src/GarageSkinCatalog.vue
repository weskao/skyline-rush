<script setup lang="ts">
import { computed } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import GarageArtworkTile from './GarageArtworkTile.vue';
import { GARAGE_SKINS, SKIN_CATEGORIES, skinArtwork } from './garage-skin-catalog.ts';
import { garageSkinState, garageSkinEntry, selectGarageSkin, equipGarageSkin, selectedGarageSkins, currentGarageSkins } from './garage-skin-runtime.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { GARAGE_RELEASE_MODE } from '#garage-release-config';

defineProps<{ locale: string }>();
const animatedArtworkSrc = (id: string): string =>
  `${import.meta.env.BASE_URL}feature-assets/garage-animated/${id}@3x.gif`;

// Source-only cosmetic status and rarity icon gallery. These artworks do not
// create a badge, inventory entitlement, artificial rarity or monetary offer.
const badgeArt = ['badge-equipped', 'badge-favorite', 'badge-limited', 'badge-locked',
  'badge-new', 'badge-trial', 'rarity-common', 'rarity-rare', 'rarity-epic',
  'rarity-legendary', 'rarity-mythic'] as const;
const badgeNames: Record<(typeof badgeArt)[number], readonly [string, string]> = {
  'badge-equipped': ['Equipped badge', '已裝備徽章'],
  'badge-favorite': ['Favorite badge', '收藏徽章'],
  'badge-limited': ['Limited badge', '限定徽章'],
  'badge-locked': ['Locked badge', '未解鎖徽章'],
  'badge-new': ['New badge', '新款徽章'],
  'badge-trial': ['Trial badge', '試用徽章'],
  'rarity-common': ['Common rarity', '普通稀有度'],
  'rarity-rare': ['Rare rarity', '稀有等級'],
  'rarity-epic': ['Epic rarity', '史詩等級'],
  'rarity-legendary': ['Legendary rarity', '傳說等級'],
  'rarity-mythic': ['Mythic rarity', '神話等級'],
};
const badgeLabel = (id: (typeof badgeArt)[number], locale: string): string =>
  badgeNames[id][locale === 'zh-TW' ? 1 : 0];
const nativePngBadges = new Set(['badge-equipped', 'badge-favorite', 'badge-limited']);
const badgeSrc = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/garage-vfx-skins/raster/${id}@3x.${nativePngBadges.has(id) ? 'png' : 'webp'}`;
const badgeTone: Record<(typeof badgeArt)[number], 'cyan' | 'magenta' | 'gold' | 'slate' | 'azure' | 'amber' | 'red'> = {
  'badge-equipped': 'cyan', 'badge-favorite': 'magenta', 'badge-limited': 'gold',
  'badge-locked': 'slate', 'badge-new': 'amber', 'badge-trial': 'gold',
  'rarity-common': 'slate', 'rarity-rare': 'azure', 'rarity-epic': 'magenta',
  'rarity-legendary': 'gold', 'rarity-mythic': 'red',
};

const categoryNames: Record<SkinCategory, { en: string; 'zh-TW': string }> = {
  thruster: { en: 'Thruster', 'zh-TW': '推進器' },
  airflow: { en: 'Airflow', 'zh-TW': '氣流' },
  'nitro-trail': { en: 'NITRO trail', 'zh-TW': '氮氣尾跡' },
  'launch-flare': { en: 'Launch flare', 'zh-TW': '起跑閃焰' },
};
const entries = GARAGE_SKINS.map(skin => ({ ...skin, artwork: skinArtwork(skin.id, import.meta.env.BASE_URL)! }));
// This live selection strip uses the same artwork and session as the actual 3D Garage preview.
// A preview is never treated as ownership or a permanent equipment grant.
const liveLoadout = computed(() => {
  void garageSkinState.revision;
  const equipped = currentGarageSkins();
  const previewed = selectedGarageSkins();
  return SKIN_CATEGORIES.map(category => {
    const entry = entries.find(skin => skin.id === previewed[category])!;
    return {
      category, id: entry.id, name: entry.name, artwork: entry.artwork,
      equipped: equipped[category], owned: garageSkinEntry(entry.id)?.owned === true,
    };
  });
});
const categoryHue: Record<SkinCategory, number> = { thruster: 191, airflow: 202, 'nitro-trail': 44, 'launch-flare': 300 };
const airflowHue: Partial<Record<SkinId, number>> = {
  'airflow-basic': 192, 'airflow-slipstream': 210, 'airflow-vortex': 280, 'airflow-prism': 312,
};
const skinHue = (id: SkinId, category: SkinCategory): number => airflowHue[id] ?? categoryHue[category];
const skinLabel = (id: SkinId, locale: string): string => GARAGE_SKINS.find(s => s.id === id)!.name[locale === 'zh-TW' ? 'zh-TW' : 'en'];
const view = (id: SkinId) => { void garageSkinState.revision; return garageSkinEntry(id); };
const isPreviewActive = (id: SkinId, category: SkinCategory) => {
  void garageSkinState.revision;
  return selectedGarageSkins()[category] === id;
};
const isPreviewOnly = (id: SkinId, category: SkinCategory) =>
  isPreviewActive(id, category) && view(id)?.state !== 'equipped';
const statusText = (id: SkinId, locale: string) => {
  const entry = view(id);
  if (entry?.state === 'equipped' && !entry.owned) return locale === 'zh-TW' ? '試用中' : 'Trial active';
  const state = entry?.state ?? 'locked';
  return ({ en: { trial: 'Free trial', equipped: 'Equipped', owned: 'Owned', locked: 'Locked' },
    'zh-TW': { trial: '免費試用', equipped: '已裝備', owned: '已擁有', locked: '未解鎖' } } as const)[locale === 'zh-TW' ? 'zh-TW' : 'en'][state];
};

</script>

<template>
  <!-- The trial/equip action passes through the session-only entitlement controller. -->
  <section id="garage-vfx-catalog" class="garage-vfx-catalog" data-preview-contract="live-shared-aero" :data-release-mode="GARAGE_RELEASE_MODE"
    aria-labelledby="garage-vfx-catalog-heading">
    <h3 id="garage-vfx-catalog-heading">{{ locale === 'zh-TW' ? '外觀特效收藏' : 'VFX collection' }}</h3>
    <p class="garage-vfx-message">{{ GARAGE_RELEASE_MODE === 'trial' ? (locale === 'zh-TW' ? '點選卡片可預覽，按「試用」暫時裝備。重新載入後仍會記住你在此帳號最後的選擇，但這不是擁有權；試用結束後會還原為預設。' : 'Select a card to preview, then Try to equip temporarily. Your last pick is remembered on reload for this account, but it is not ownership; it returns to default when the trial ends.') : (locale === 'zh-TW' ? '預覽不會解鎖外觀。裝備需要有效擁有權。' : 'Preview does not unlock skins. Equip requires ownership.') }}</p>
    <section id="garage-vfx-live-loadout" class="garage-vfx-live-loadout" :aria-label="locale === 'zh-TW' ? '目前外觀特效' : 'Current VFX appearance'">
      <h4>{{ locale === 'zh-TW' ? '目前外觀特效' : 'Current VFX appearance' }}</h4>
      <ul class="garage-vfx-loadout-grid">
        <li v-for="item in liveLoadout" :key="item.category" class="garage-vfx-loadout-tile"
          :data-loadout-category="item.category" :data-preview-skin="item.id"
          :data-equipped-skin="item.equipped" :data-preview-only="String(item.id !== item.equipped)"
          :data-owned="String(item.owned)">
          <span class="garage-loadout-art">
            <GarageArtworkImage :src="item.artwork.src"
              :fallback-src="item.artwork.hasRaster ? item.artwork.fallback : ''"
              :size="item.artwork.cssSize" alt="" loading="eager"
              :fallback-text="categoryNames[item.category][locale === 'zh-TW' ? 'zh-TW' : 'en']" />
          </span>
          <strong>{{ categoryNames[item.category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
          <span class="garage-loadout-name">{{ item.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</span>
          <small class="garage-loadout-status" aria-live="polite">{{
            item.id !== item.equipped
              ? (locale === 'zh-TW' ? '預覽中' : 'Previewing')
              : !item.owned
                ? (locale === 'zh-TW' ? '試用中' : 'Trial active')
                : (locale === 'zh-TW' ? '已裝備' : 'Equipped')
          }}</small>
        </li>
      </ul>
    </section>
    <div v-for="category in SKIN_CATEGORIES" :key="category" class="garage-vfx-category">
      <h4>{{ categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
      <ul>
        <li v-for="skin in entries.filter(entry => entry.category === category)" :key="skin.id"
          :data-skin="skin.id" :data-state="view(skin.id)?.state" :data-owned="String(view(skin.id)?.owned ?? false)"
          :data-preview-active="String(isPreviewActive(skin.id, skin.category))"
          :data-preview-only="String(isPreviewOnly(skin.id, skin.category))"
          class="garage-skin-card" :style="{ '--card-hue': skinHue(skin.id, skin.category) }">
          <!-- Native full-surface Preview control; Equip/Try is its sibling, not nested. -->
          <button class="garage-skin-preview-hitarea" type="button"
            :aria-label="`${locale === 'zh-TW' ? '預覽' : 'Preview'} ${skinLabel(skin.id, locale)}`"
            :aria-pressed="isPreviewActive(skin.id, skin.category)"
            @click="selectGarageSkin(skin.id)">
            <span class="garage-vfx-art">
              <GarageArtworkImage :src="skin.artwork.src" :fallback-src="skin.artwork.hasRaster ? skin.artwork.fallback : ''"
                :animated-src="animatedArtworkSrc(skin.id)"
                :size="skin.artwork.cssSize" alt="" loading="lazy" fallback-class="garage-vfx-fallback"
                :fallback-text="categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en']" />
            </span>
            <strong>{{ skin.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
            <small class="garage-skin-status">{{ statusText(skin.id, locale) }}</small>
            <small class="garage-skin-preview-label" :aria-hidden="!isPreviewOnly(skin.id, skin.category)">{{ locale === 'zh-TW' ? '預覽中' : 'Previewing' }}</small>
          </button>
          <div class="garage-vfx-actions">
            <button class="garage-skin-action" type="button" :disabled="!view(skin.id)?.canEquip"
              @click.stop="equipGarageSkin(skin.id)">
              {{ view(skin.id)?.state === 'equipped' ? (locale === 'zh-TW' ? '已裝備' : 'Equipped') : view(skin.id)?.owned ? (locale === 'zh-TW' ? '裝備' : 'Equip') : GARAGE_RELEASE_MODE === 'trial' ? (locale === 'zh-TW' ? '免費試用' : 'Try free') : (locale === 'zh-TW' ? '未解鎖' : 'Locked') }}
            </button>
          </div>
        </li>
      </ul>
    </div>
    <section id="garage-vfx-art-badges" class="garage-art-showcase" :aria-label="locale === 'zh-TW' ? '徽章與稀有度素材展示' : 'Badge and rarity art preview'">
      <h4>{{ locale === 'zh-TW' ? '徽章與稀有度 · 素材展示' : 'Badges and rarity · art reference' }}</h4>
      <p class="garage-vfx-message">{{ locale === 'zh-TW' ? '僅展示 3× 原始素材，不代表已擁有、限時活動或已解鎖稀有度。' : 'Artwork reference only. No ownership, time-limited event or rarity entitlement is implied.' }}</p>
      <div class="garage-art-badges">
        <GarageArtworkTile v-for="id in badgeArt" :key="id" :id="id"
          :label="badgeLabel(id, locale)" :src="badgeSrc(id)"
          :tone="badgeTone[id]" :restored="true" />
      </div>
    </section>
    <p class="garage-vfx-message" role="status">{{ locale === 'zh-TW' ? '特效僅改變外觀，不影響速度、獎勵或舊有車漆。' : 'Cosmetics only. Speed, rewards and existing paints are unchanged.' }}</p>
  </section>
</template>

<style scoped>
.garage-vfx-catalog { border-top: 1px solid #35536a; margin-top: 14px; padding-top: 10px; }
.garage-vfx-catalog h3 { margin: 0 0 6px; font-size: 15px; }
.garage-vfx-live-loadout {
  padding: 8px 6px; border: 1px solid #467a93; border-radius: 12px;
  background: linear-gradient(160deg, #162d43, #0c1c2e 82%);
}
.garage-vfx-live-loadout h4 { margin: 0 0 6px; font-size: 13px; color: #e2f8ff; }
/* Four tiles as one 2x2 block: the 226px tablet/landscape column still fits two 104px art frames. */
.garage-vfx-loadout-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px; padding: 0; margin: 0; list-style: none;
}
.garage-vfx-loadout-tile {
  display: flex; flex-direction: column; align-items: center; min-width: 0;
  gap: 2px; padding: 5px 2px 6px; box-sizing: border-box; text-align: center;
  border: 1px solid #315875; border-radius: 10px;
  background: radial-gradient(ellipse at center 30%, #26719c28, transparent 70%), #102438;
}
.garage-loadout-art {
  width: 104px; height: 104px; max-width: 100%; padding: 4px; box-sizing: border-box;
  display: grid; place-items: center; position: relative;
  border-radius: 10px; background: radial-gradient(circle, #36a6c02b, transparent 76%);
}
.garage-loadout-art :deep(.artwork-img) { object-fit: contain; max-width: 100%; max-height: 100%; }
.garage-vfx-loadout-tile strong { color: #e8faff; font-size: 12px; line-height: 1.25; }
.garage-loadout-name { font-size: 11px; line-height: 1.3; color: #d3e7f4; overflow-wrap: anywhere; }
.garage-loadout-status { font-size: 11px; font-weight: 750; color: #83f0da; }
.garage-vfx-loadout-tile[data-preview-only="true"] {
  border-color: #76e8ff; box-shadow: inset 0 0 12px #30caff2d, 0 0 9px #31c6f73d;
}
.garage-vfx-loadout-tile[data-preview-only="true"] .garage-loadout-status { color: #bcecff; }
.garage-vfx-loadout-tile[data-preview-only="true"] .garage-loadout-art::after {
  content: ''; position: absolute; inset: 8px; border-radius: 50%;
  border: 1px solid #8feaff9e; pointer-events: none;
  animation: garage-vfx-preview-pulse 2.6s ease-in-out infinite;
}
.garage-vfx-message { font-size: 12px; line-height: 1.45; color: #c2d4e3; margin: 6px 0 10px; }
.garage-vfx-category { margin: 12px 0; }
.garage-vfx-category h4 { font-size: 13px; margin: 0 0 6px; }
/* 114px = 112px art frame + borders: three cards fit the 358px list of a 390px phone, art stays native 96px. */
.garage-vfx-category ul {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 114px), 1fr));
  gap: 6px; padding: 0; margin: 0; list-style: none;
}
.garage-vfx-category li.garage-skin-card {
  box-sizing: border-box; position: relative; isolation: isolate;
  min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 0; text-align: center;
  border: 1px solid hsl(var(--card-hue) 63% 59% / .5);
  border-radius: 14px 6px 14px 6px;
  background: radial-gradient(ellipse at 50% 18%, hsl(var(--card-hue) 64% 38% / .28), transparent 78%),
    linear-gradient(158deg, #1c2d4a, #0b1729 85%);
  box-shadow: inset 0 1px #ffffff18, 0 5px 15px #0005;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.garage-skin-card::after {
  content: ''; position: absolute; inset: 5px 5px auto; height: 1px;
  background: linear-gradient(90deg, transparent, hsl(var(--card-hue) 89% 74% / .5), transparent);
  pointer-events: none;
}
.garage-skin-preview-hitarea {
  position: relative; z-index: 1; flex: 1; width: 100%; min-height: 0;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  border: 0; border-radius: inherit; padding: 2px 0 4px; color: inherit;
  text-align: center; background: transparent; cursor: pointer; touch-action: manipulation;
}
/* Press feedback belongs to the whole card, never a dimmed box around its upper part. */
.garage-skin-preview-hitarea:active:not(:disabled) { filter: none; }
.garage-vfx-category li.garage-skin-card:has(> .garage-skin-preview-hitarea:active) { filter: brightness(.86); transform: scale(.985); }
.garage-skin-preview-hitarea:focus-visible {
  outline: 3px solid #74ebff; outline-offset: 3px;
}
.garage-vfx-art {
  position: relative;
  width: 112px; height: 112px; max-width: 100%; box-sizing: border-box;
  padding: 8px; display: grid; place-items: center; border-radius: 13px;
  background: radial-gradient(circle, hsl(var(--card-hue) 74% 44% / .19), transparent 73%);
  pointer-events: none;
}
.garage-vfx-art :deep(.artwork-img) {
  max-width: 100%; max-height: 100%; object-fit: contain;
  filter: drop-shadow(0 0 5px hsl(var(--card-hue) 85% 64% / .34));
}
.garage-vfx-art::after {
  content: ''; position: absolute; inset: 9px; border-radius: 50%;
  border: 1px solid hsl(var(--card-hue) 95% 74% / .8);
  box-shadow: 0 0 13px hsl(var(--card-hue) 100% 67% / .35);
  opacity: 0; pointer-events: none;
}
.garage-skin-card[data-preview-only="true"] .garage-vfx-art::after {
  animation: garage-vfx-preview-pulse 2.6s ease-in-out infinite;
}
@keyframes garage-vfx-preview-pulse {
  0%, 100% { opacity: .15; transform: scale(.94); }
  50% { opacity: .55; transform: scale(1.05); }
}
.garage-vfx-fallback { color: #c4e7f0; font-size: 12px; overflow-wrap: anywhere; }
.garage-skin-card strong {
  padding: 0 4px; font-size: 12px; line-height: 1.3; color: #ecf6ff;
  font-weight: 750; overflow-wrap: anywhere; pointer-events: none;
}
/* One state pill per card: "Previewing" takes the status pill's place instead of its own row. */
.garage-skin-status, .garage-skin-preview-label {
  font-size: 11px; min-height: 19px; padding: 1px 7px; border-radius: 999px;
  background: hsl(var(--card-hue) 82% 54% / .13);
  color: hsl(var(--card-hue) 91% 80%); border: 1px solid hsl(var(--card-hue) 60% 61% / .28);
  pointer-events: none;
}
.garage-skin-preview-label { display: none; font-weight: 750; color: #bdefff; }
.garage-skin-card[data-preview-only="true"] .garage-skin-preview-label { display: block; }
.garage-skin-card[data-preview-only="true"] .garage-skin-status { display: none; }
.garage-vfx-actions { position: relative; z-index: 2; width: 100%; display: flex; justify-content: center; margin-top: auto; padding: 0 5px 5px; box-sizing: border-box; }
.garage-vfx-actions .garage-skin-action {
  display: block; min-height: 44px; width: 100%; border-radius: 10px 4px 10px 4px;
  border: 1px solid hsl(var(--card-hue) 82% 67% / .85);
  background: linear-gradient(125deg, hsl(var(--card-hue) 72% 43%), hsl(var(--card-hue) 71% 27%));
  color: #f4fdff; font-size: 12px; font-weight: 800; letter-spacing: .04em;
  text-shadow: 0 1px 2px #0008; box-shadow: inset 0 1px #ffffff45, 0 3px 9px #0005;
  cursor: pointer; transition: background .18s ease, filter .18s ease, transform .18s ease;
}
.garage-vfx-actions .garage-skin-action:disabled {
  background: linear-gradient(135deg, #223648, #142334); border-color: #456175;
  color: #b7cbd8; cursor: not-allowed; box-shadow: none;
}
.garage-vfx-actions .garage-skin-action:focus-visible { outline: 3px solid #74ebff; outline-offset: 2px; }
.garage-skin-card[data-state="equipped"] .garage-skin-status { color: #70f3d6; border-color: #37bca286; }
.garage-skin-card[data-state="locked"] .garage-skin-status { color: #b5c1d3; border-color: #8093ad66; }
/* id-qualified so the Garage panel's shared card surface cannot cancel the selected glow */
#garage-vfx-catalog .garage-vfx-category li.garage-skin-card[data-preview-active="true"] {
  border-color: hsl(var(--card-hue) 94% 77%);
  box-shadow: 0 0 0 1px hsl(var(--card-hue) 90% 70% / .57),
    0 0 23px hsl(var(--card-hue) 88% 58% / .32), inset 0 0 20px hsl(var(--card-hue) 80% 48% / .15);
}
.garage-skin-card[data-preview-active="true"]::before {
  content: '◉'; position: absolute; top: 4px; right: 6px;
  z-index: 2; font-size: 13px; color: hsl(var(--card-hue) 95% 78%);
  pointer-events: none;
}
@media (hover: hover) and (pointer: fine) {
  .garage-vfx-category li.garage-skin-card:hover {
    transform: translateY(-3px);
    border-color: hsl(var(--card-hue) 92% 72%);
    box-shadow: 0 9px 24px #0008, 0 0 16px hsl(var(--card-hue) 80% 60% / .25);
  }
  .garage-vfx-actions .garage-skin-action:enabled:hover { filter: brightness(1.19) saturate(1.15); transform: translateY(-1px); }
}
@media (hover: none) {
  .garage-vfx-category li.garage-skin-card:active { transform: scale(.99); }
}
.garage-art-showcase { margin: 18px 0 10px; padding-top: 14px; border-top: 1px solid #46688b; }
.garage-art-showcase h4 { color: #d4ddff; letter-spacing: .04em; }
/* 104px = 88px art frame + 7px card padding + borders: three badges fit the 328px list of a 360px phone. */
.garage-art-badges {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 104px), 1fr));
  gap: 6px;
  align-items: stretch;
}
.garage-art-showcase { min-width: 0; }
.garage-art-showcase h4 { margin-bottom: 10px; }
@media (prefers-reduced-motion: reduce), (prefers-reduced-data: reduce) {
  .garage-vfx-catalog *, .garage-vfx-catalog *::after { animation: none !important; transition: none !important; }
}
</style>
