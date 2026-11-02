<script setup lang="ts">
import GarageArtworkImage from './GarageArtworkImage.vue';
import GarageArtworkTile from './GarageArtworkTile.vue';
import { GARAGE_SKINS, SKIN_CATEGORIES, skinArtwork } from './garage-skin-catalog.ts';
import { garageSkinState, garageSkinEntry, selectGarageSkin, equipGarageSkin, selectedGarageSkins } from './garage-skin-runtime.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { GARAGE_RELEASE_MODE } from '#garage-release-config';

defineProps<{ locale: string }>();

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
const badgeSrc = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/garage-vfx-skins/raster/${id}@3x.webp`;
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
const statusText = (id: SkinId, locale: string) => {
  const state = view(id)?.state ?? 'locked';
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
    <div v-for="category in SKIN_CATEGORIES" :key="category" class="garage-vfx-category">
      <h4>{{ categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
      <ul>
        <li v-for="skin in entries.filter(entry => entry.category === category)" :key="skin.id"
          :data-skin="skin.id" :data-state="view(skin.id)?.state" :data-owned="String(view(skin.id)?.owned ?? false)"
          :data-preview-active="String(isPreviewActive(skin.id, skin.category))"
          class="garage-skin-card" :style="{ '--card-hue': skinHue(skin.id, skin.category) }">
          <!-- Native full-surface Preview control; Equip/Try is its sibling, not nested. -->
          <button class="garage-skin-preview-hitarea" type="button"
            :aria-label="`${locale === 'zh-TW' ? '預覽' : 'Preview'} ${skinLabel(skin.id, locale)}`"
            :aria-pressed="isPreviewActive(skin.id, skin.category)"
            @click="selectGarageSkin(skin.id)">
            <span class="garage-vfx-art">
              <GarageArtworkImage :src="skin.artwork.src" :fallback-src="skin.artwork.hasRaster ? skin.artwork.fallback : ''"
                :size="skin.artwork.cssSize" alt="" loading="eager" fallback-class="garage-vfx-fallback"
                :fallback-text="categoryNames[category][locale === 'zh-TW' ? 'zh-TW' : 'en']" />
            </span>
            <strong>{{ skin.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
            <small class="garage-skin-status">{{ statusText(skin.id, locale) }}</small>
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
.garage-vfx-message { font-size: 12px; line-height: 1.45; color: #c2d4e3; margin: 6px 0 10px; }
.garage-vfx-category { margin: 12px 0; }
.garage-vfx-category h4 { font-size: 13px; margin: 0 0 6px; }
.garage-vfx-category ul {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 138px), 1fr));
  gap: 10px; padding: 0; margin: 0; list-style: none;
}
.garage-vfx-category li.garage-skin-card {
  box-sizing: border-box; position: relative; isolation: isolate;
  min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px;
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
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  border: 0; border-radius: inherit; padding: 12px 8px 8px; color: inherit;
  text-align: center; background: transparent; cursor: pointer; touch-action: manipulation;
}
/* Press feedback belongs to the whole card, never a dimmed box around its upper part. */
.garage-skin-preview-hitarea:active:not(:disabled) { filter: none; }
.garage-vfx-category li.garage-skin-card:has(> .garage-skin-preview-hitarea:active) { filter: brightness(.86); transform: scale(.985); }
.garage-skin-preview-hitarea:focus-visible {
  outline: 3px solid #74ebff; outline-offset: 3px;
}
.garage-vfx-art {
  width: 112px; height: 112px; max-width: 100%; box-sizing: border-box;
  padding: 8px; display: grid; place-items: center; border-radius: 13px;
  background: radial-gradient(circle, hsl(var(--card-hue) 74% 44% / .19), transparent 73%);
  pointer-events: none;
}
.garage-vfx-art :deep(.artwork-img) {
  max-width: 100%; max-height: 100%; object-fit: contain;
  filter: drop-shadow(0 0 5px hsl(var(--card-hue) 85% 64% / .34));
}
.garage-vfx-fallback { color: #c4e7f0; font-size: 12px; overflow-wrap: anywhere; }
.garage-skin-card strong {
  min-height: 35px; font-size: 12px; line-height: 1.5; color: #ecf6ff;
  font-weight: 750; overflow-wrap: anywhere; pointer-events: none;
}
.garage-skin-status {
  font-size: 11px; min-height: 19px; padding: 1px 7px; border-radius: 999px;
  background: hsl(var(--card-hue) 82% 54% / .13);
  color: hsl(var(--card-hue) 91% 80%); border: 1px solid hsl(var(--card-hue) 60% 61% / .28);
  pointer-events: none;
}
.garage-vfx-actions { position: relative; z-index: 2; width: 100%; display: flex; justify-content: center; margin-top: auto; padding: 0 8px 10px; box-sizing: border-box; }
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
  content: '◉'; position: absolute; top: 7px; right: 9px;
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
.garage-art-badges {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 115px), 1fr));
  gap: clamp(8px, 1.5vw, 13px);
  align-items: stretch;
}
.garage-art-showcase { min-width: 0; }
.garage-art-showcase h4 { margin-bottom: 10px; }
@media (max-height: 420px) and (orientation: landscape) { .garage-vfx-category ul { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { .garage-vfx-catalog * { animation: none !important; transition: none !important; } }
</style>
