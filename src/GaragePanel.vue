<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
import { garageStudioView } from './garage-view-state.ts';
import { PAINTS } from './appearance.ts';
import { garageView } from './garage-view-state.ts';
import CloseButton from './CloseButton.vue';
import GaragePaintPreview from './GaragePaintPreview.vue';
import GarageSourceArtGallery from './GarageSourceArtGallery.vue';
import GarageSkinCatalog from '#garage-skin-ui';
import { GARAGE_RELEASE_MODE } from '#garage-release-config';
const locale = ref(getLocale());
let unsubscribe: (() => void) | undefined;
onMounted(() => { unsubscribe = onLocaleChange(value => { locale.value = value; }); });
onUnmounted(() => unsubscribe?.());
const copy = computed(() => locale.value === 'zh-TW' ? {
  showroom: '3D 車輛展示間', title: '預覽工作室', open: '開啟全螢幕預覽', back: '返回車庫',
  hint: '拖曳旋轉，雙指或滾輪縮放', angles: ['車頭', '車尾', '側面', '俯視', '斜後方'],
  left: '向左旋轉', right: '向右旋轉', zoomIn: '放大', zoomOut: '縮小',
  auto: '自動旋轉', reset: '重設鏡頭', viewMode: '展示姿態', ground: '平地展示', flight: '起飛展示', wing: '尾翼展開', collection: '車漆收藏',
  coming: GARAGE_RELEASE_MODE === 'coming-soon' ? '外觀特效即將推出' : GARAGE_RELEASE_MODE === 'trial' ? '外觀特效免費試用中：重新載入後記住此帳號最後的選擇；不代表永久擁有' : '外觀特效已開放，裝備須具備擁有權', equipped: '已裝備', owned: '已擁有', locked: '未解鎖',
  cosmetic: '外觀不影響車輛性能', restore: '恢復預設車漆', equipment: GARAGE_RELEASE_MODE === 'coming-soon' ? '即將推出' : GARAGE_RELEASE_MODE === 'trial' ? '特效試用' : '外觀特效',
  preview: '預覽', unlockNote: '累積賽道星數可解鎖車漆；未解鎖車漆僅能試看。',
} : {
  showroom: '3D vehicle showroom', title: 'PREVIEW STUDIO', open: 'Open full-screen Studio', back: 'Back to Garage',
  hint: 'Drag to rotate. Pinch or scroll to zoom.', angles: ['Front', 'Rear', 'Side', 'Top', '3/4 view'],
  left: 'Rotate left', right: 'Rotate right', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  auto: 'Auto rotate', reset: 'Reset camera', viewMode: 'Display pose', ground: 'Ground', flight: 'Flight', wing: 'Open wing', collection: 'Paint collection',
  coming: GARAGE_RELEASE_MODE === 'coming-soon' ? 'Cosmetic VFX coming soon' : GARAGE_RELEASE_MODE === 'trial' ? 'Try VFX for free. Your last pick is remembered on reload for this account; no permanent ownership.' : 'Cosmetic VFX is available; equip requires ownership', equipped: 'Equipped', owned: 'Owned', locked: 'Locked',
  cosmetic: 'Appearance does not change performance', restore: 'Restore default paint', equipment: GARAGE_RELEASE_MODE === 'coming-soon' ? 'Coming soon' : GARAGE_RELEASE_MODE === 'trial' ? 'VFX trial' : 'Cosmetic VFX',
  preview: 'Preview', unlockNote: 'Earn track stars to unlock paint; locked finishes are preview-only.',
});
const angles = ['front', 'rear', 'side', 'top', 'cinematic'] as const;
const paintState = (id: string) => id === garageStudioView.equippedPaint ? 'equipped'
  : garageStudioView.ownedPaints.includes(id) ? 'owned' : 'locked';
</script>

<template>
  <dialog id="garage-screen" class="history-screen garage-screen" :data-page="garageStudioView.page" aria-labelledby="garage-title">
    <header class="garage-heading">
      <button v-show="garageStudioView.page === 'studio'" id="garage-studio-back" type="button" :aria-label="copy.back">‹ {{ copy.back }}</button>
      <h2 id="garage-title">{{ garageStudioView.page === 'studio' ? copy.title : (locale === 'zh-TW' ? '車庫' : 'Garage') }}</h2>
      <button id="garage-studio-open" v-show="garageStudioView.page === 'home'" type="button" class="garage-entry">{{ copy.open }} ↗</button>
      <CloseButton id="garage-close" label="Close garage" data-i18n-aria-label="garage.close" /></header>
    <div class="garage-layout">
      <section class="garage-visual" :aria-label="copy.showroom">
        <div id="garage-preview" class="garage-preview" tabindex="0" role="group" :aria-label="copy.hint" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + -">
          <p v-show="garageStudioView.page === 'studio'" class="garage-hint">{{ copy.hint }}</p>
        </div>
        <div class="garage-mode-controls" role="group" :aria-label="copy.viewMode">
          <span class="garage-mode-label">{{ copy.viewMode }}</span>
          <button type="button" data-garage-mode="ground" :aria-pressed="garageStudioView.mode === 'ground'">{{ copy.ground }}</button>
          <button type="button" data-garage-mode="flight" :aria-pressed="garageStudioView.mode === 'flight'">{{ copy.flight }}</button>
          <button type="button" id="garage-wing" :aria-pressed="garageStudioView.wing">{{ copy.wing }}</button>
        </div>
        <nav v-show="garageStudioView.page === 'studio'" class="garage-camera-controls" :aria-label="locale === 'zh-TW' ? '鏡頭控制' : 'Camera controls'">
          <button v-for="(angle, index) in angles" :key="angle" type="button" :data-garage-angle="angle" :aria-pressed="garageStudioView.angle === angle">{{ copy.angles[index] }}</button>
          <button type="button" id="garage-rotate-left" :aria-label="copy.left">↶</button>
          <button type="button" id="garage-rotate-right" :aria-label="copy.right">↷</button>
          <button type="button" id="garage-zoom-out" :aria-label="copy.zoomOut">−</button>
          <button type="button" id="garage-zoom-in" :aria-label="copy.zoomIn">＋</button>
          <button type="button" id="garage-auto-rotate" :aria-pressed="garageStudioView.autoRotate">{{ copy.auto }}</button>
          <button type="button" id="garage-reset">{{ copy.reset }}</button>
        </nav>
      </section>
      <aside class="garage-collection">
        <h3>{{ copy.collection }}</h3>
        <p class="collection-note garage-intro" v-show="garageStudioView.page === 'home'" data-i18n="garage.intro">Explore paint and tail light combinations. Appearance never changes performance.</p>
    <div class="paint-options" role="group" aria-label="Preview car finish" data-i18n-aria-label="garage.finishes"><button type="button" v-for="(paint, id) in PAINTS" :data-paint="id" :data-state="paintState(id)" :aria-label="`${copy.preview} ${t('paint.' + id)} · ${copy[paintState(id)]}`" :aria-pressed="id === garageView.selected" :key="id"><GaragePaintPreview :id="id" :color="paint.paint" /><span class="garage-paint-meta"><span class="garage-paint-name" :data-i18n="`paint.${id}`">{{ t('paint.' + id) }}</span><span class="garage-paint-badge">{{ copy[paintState(id)] }}</span></span></button></div>
    <p id="garage-status" class="collection-note" role="status">{{ garageView.status }}</p>
    <button id="garage-equip" class="controls-reset" :disabled="garageView.equipDisabled" aria-label="Equip finish" data-i18n-aria-label="garage.equip">{{ garageView.equipLabel }}</button>
    <button v-show="garageStudioView.page === 'studio'" id="garage-restore-default" type="button" class="garage-restore">{{ copy.restore }}</button>
        <p class="collection-note">{{ copy.unlockNote }}</p>
        <p class="garage-coming">{{ copy.coming }}</p>
        <GarageSkinCatalog :locale="locale" />
        <p v-show="garageStudioView.page === 'studio'" class="garage-cosmetic">{{ copy.cosmetic }}</p>
        <GarageSourceArtGallery category="garage-store-readiness" />
        <GarageSourceArtGallery category="garage-rewards-and-missions" />
      </aside>
    </div>
  </dialog>
</template>

<style>
/* The full-screen Garage/Studio covers the home: stop rendering it, or iOS WebKit flashes its animated layers
   (START sheen, Garage pulse) over the dialog. Descendants too: airflow mode forces #start-button visible. */
#app:has(> #garage-screen[open]) > :not(dialog), #app:has(> #garage-screen[open]) > :not(dialog) * { visibility: hidden !important; }
#garage-screen.garage-screen { position: fixed; inset: 0; width: 100vw; max-width: none; height: 100dvh; max-height: none; margin: 0; border-radius: 0; padding: max(7px, env(safe-area-inset-top)) max(7px, env(safe-area-inset-right)) max(7px, env(safe-area-inset-bottom)) max(7px, env(safe-area-inset-left)); overflow: hidden; display: none; flex-direction: column; gap: 6px; }
#garage-screen.garage-screen[open] { display: flex; }
#garage-screen .garage-heading { display: flex; align-items: center; gap: 6px; flex: none; min-height: 44px; }
#garage-screen .garage-heading h2 { margin: 0; flex: 1; min-width: 0; font-size: clamp(18px, 2.4vw, 26px); }
#garage-screen .garage-heading > button:not(.close-button), #garage-screen .garage-camera-controls button, #garage-screen .garage-entry { min-height: 44px; border: 1px solid #698297; border-radius: 6px; background: #1b3044; padding: 8px 12px; }
#garage-screen .garage-entry { flex: 0 1 auto; align-self: center; max-width: min(49vw, 240px); border-color: var(--accent); font-weight: 700; line-height: 1.15; font-size: clamp(11px, 1.5vw, 13px); padding-inline: 9px; }
#garage-screen .garage-intro { margin: 0; font-size: 13px; }
#garage-screen .garage-layout { min-height: 0; flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) clamp(260px, 27vw, 400px); gap: 8px; }
#garage-screen .garage-visual { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
#garage-screen .garage-preview { flex: 1; position: relative; min-height: 110px; height: auto; margin: 0; border: 1px solid #42596c; border-radius: 12px; overflow: hidden; touch-action: none; background: #081c2e; }
/* The home camera dock sits under the showroom on the Garage page (Studio has its own camera controls). */
#garage-screen #showcase-camera-dock { position: static; inset: auto; flex: none; width: auto; margin: 0; padding: 4px 10px; display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 12px; visibility: visible; }
#garage-screen[data-page="studio"] #showcase-camera-dock { display: none; }
#garage-screen #showcase-camera-dock .showcase-camera-actions { width: auto; gap: 10px; }
#garage-screen #showcase-camera-name { min-width: 64px; }
#garage-screen #world { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
#garage-screen .garage-hint { position: absolute; z-index: 2; bottom: 8px; left: 8px; max-width: calc(100% - 16px); margin: 0; padding: 4px 8px; border-radius: 6px; background: #071725b8; color: #c2d4e3; font-size: 11px; pointer-events: none; }
#garage-screen .garage-camera-controls { display: flex; flex-wrap: nowrap; overflow-x: auto; overflow-y: hidden; justify-content: flex-start; flex: none; gap: 4px; white-space: nowrap; scrollbar-width: thin; }
#garage-screen .garage-camera-controls button { min-width: 44px; flex: none; }
#garage-screen .garage-camera-controls button[aria-pressed="true"] { border-color: var(--accent); background: #35485d; }
#garage-screen .garage-collection { min-height: 0; overflow-y: auto; scrollbar-gutter: auto; }
#garage-screen .garage-collection h3 { margin: 2px 0 7px; font-size: 14px; letter-spacing: .1em; }
#garage-screen .paint-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
#garage-screen .garage-collection .controls-reset { margin: 7px 0; }
#garage-screen .garage-coming { color: #c2d4e3; font-size: 12px; border: 1px dashed #698297; border-radius: 6px; padding: 6px; }
#garage-screen[data-page="home"] .garage-layout { max-width: none; width: 100%; margin: 0; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen .garage-layout { display: flex; flex-direction: column; gap: 5px; }
  #garage-screen .garage-visual { flex: 1 1 0; min-height: 0; }
  #garage-screen .garage-collection { flex: 0 0 clamp(200px, 30dvh, 300px); }
  #garage-screen .paint-options { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #garage-screen .garage-camera-controls { max-height: none; overflow-y: hidden; }
  #garage-screen .garage-camera-controls button { padding-inline: 8px; font-size: 12px; }
  #garage-screen .garage-mode-label { display: none; }
  #garage-screen .garage-mode-controls button { flex: 1; }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen.garage-screen { gap: 5px; padding-block: 5px; }
  #garage-screen .garage-layout { grid-template-columns: minmax(0, 1fr) minmax(180px, 260px); gap: 8px; }
  #garage-screen .garage-hint { display: none; }
  #garage-screen .garage-camera-controls { max-height: none; overflow-y: hidden; }
  #garage-screen .garage-mode-label { display: none; }
  #garage-screen .garage-mode-controls button { min-width: 80px; }
  #garage-screen .garage-camera-controls button { font-size: 11px; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) { #garage-screen, #garage-screen * { animation: none !important; transition: none !important; } }

/* Actual 3D car and studio lighting are rendered by Three.js; CSS owns controls only. */
#garage-screen.garage-screen { color: #e8f3fb; background: radial-gradient(ellipse at 32% 22%, #193549 0, #0a1624 56%, #060e1b 100%); }
#garage-screen[data-page="studio"] .garage-heading { border-bottom: 1px solid #28475b; padding-bottom: 3px; }
#garage-screen[data-page="studio"] .garage-heading h2 { margin-left: 5px; font-style: italic; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; }
#garage-screen .garage-kicker { margin: 0; color: #71c8dd; letter-spacing: .2em; font-size: 10px; }
#garage-screen[data-page="studio"] .garage-visual { background: #091827; border: 1px solid #294858; border-radius: 10px; padding: 4px; }
#garage-screen[data-page="studio"] .garage-preview { border-color: #31576c; background: #08121f; box-shadow: inset 0 0 50px #06101b; }
#garage-screen[data-page="studio"] .garage-camera-controls { background: #0a1724; border: 1px solid #24455a; border-radius: 8px; padding: 3px; }
#garage-screen .garage-camera-controls button { background: #11283b; border-color: #35536a; color: #dfeef7; cursor: pointer; }
#garage-screen .garage-camera-controls button[aria-pressed="true"] { background: #063e58; color: #68e4ff; border-color: #19cbf6; box-shadow: inset 0 0 0 1px #0084a5; }
#garage-screen .garage-mode-controls { display: flex; flex-wrap: nowrap; align-items: center; justify-content: flex-start; flex: none; gap: 5px; }
#garage-screen .garage-mode-label { color: #a7c7db; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; margin-inline-end: 3px; }
#garage-screen .garage-mode-controls button { min-height: 44px; min-width: 100px; padding: 8px 15px; border-radius: 999px; border: 1px solid #547188; color: #d5e8f6; background: #172a3e; font-weight: 800; cursor: pointer; }
#garage-screen .garage-mode-controls button[aria-pressed="true"] { color: #041a29; background: linear-gradient(110deg, #83eeff, #49bff9); border-color: #b5f4ff; box-shadow: 0 0 17px #2fbcf258; }
#garage-screen .garage-mode-controls button[data-garage-mode="flight"][aria-pressed="true"] { background: linear-gradient(110deg, #ffc58b, #f897dc); border-color: #ffdfbd; box-shadow: 0 0 18px #fa9c9d67; }
#garage-screen .garage-collection { background: #0b1928; border: 1px solid #294455; border-radius: 12px; padding: 9px; }
#garage-screen .paint-options { display: grid; gap: 8px; }
#garage-screen .paint-options button { position: relative; display: flex; flex-direction: column; align-items: stretch; gap: 5px; min-height: 86px; padding: 7px; border-radius: 9px; background: #112436; border: 1px solid #365166; color: #e5f2fb; cursor: pointer; }
#garage-screen .paint-options button i { display: block; height: 34px; border-radius: 5px; box-shadow: inset -14px -8px 20px #0004, inset 8px 8px 18px #fff3; }
#garage-screen .paint-options button[aria-pressed="true"] { border-color: #12d4ff; outline: 1px solid #12d4ff; box-shadow: 0 0 12px #00bce833; }
#garage-screen .garage-paint-name { font-weight: 700; }
#garage-screen .garage-paint-badge { font-size: 10px; color: #a8e9fb; }
#garage-screen .paint-options button[data-state="locked"] { color: #b2beca; border-style: dashed; }
#garage-screen .paint-options button[data-state="locked"] .garage-paint-badge { color: #ffcf9e; }
#garage-screen .garage-collection .controls-reset { border: 1px solid #0cc3e5; border-radius: 8px; background: #08b8da; color: #071a26; font-weight: 800; min-height: 44px; }
#garage-screen .garage-collection .controls-reset:disabled { background: #294150; border-color: #506473; color: #c4d0d9; }
#garage-screen .garage-restore { display: block; width: 100%; border: 1px solid #49667a; border-radius: 8px; min-height: 44px; background: #10263a; color: #e0f1fc; }
#garage-screen .garage-cosmetic { border-top: 1px solid #28485a; color: #8caab9; font-size: 11px; padding-top: 10px; }
#garage-screen button:focus-visible, #garage-screen .garage-preview:focus-visible { outline: 3px solid #60e6ff; outline-offset: 2px; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen.garage-screen { padding-inline: max(7px, env(safe-area-inset-left)) max(7px, env(safe-area-inset-right)); gap: 5px; }
  #garage-screen[data-page="studio"] .garage-visual { flex: 1 1 0; min-height: 0; padding: 3px; }
  #garage-screen[data-page="studio"] .garage-collection { flex: 0 0 clamp(200px, 30dvh, 300px); }
  #garage-screen .garage-collection { padding: 7px; }
  #garage-screen .garage-camera-controls { max-height: none; overflow-y: hidden; }
  #garage-screen .garage-camera-controls button { min-width: 44px; min-height: 44px; font-size: 12px; padding: 5px; }
  #garage-screen .paint-options button { min-height: 78px; }
  #garage-screen .paint-options button i { height: 26px; }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen[data-page="studio"] .garage-layout { grid-template-columns: minmax(0, 1fr) minmax(210px, 33%); }
  #garage-screen .garage-collection { padding: 6px; }
  #garage-screen .garage-camera-controls { max-height: none; overflow-x: auto; overflow-y: hidden; flex-wrap: nowrap; justify-content: flex-start; }
  #garage-screen .garage-camera-controls button { flex: none; min-height: 44px; }
  #garage-screen .garage-paint-badge { font-size: 10px; }
}

/* Garage home: the pose buttons share one row with the camera dock under the showroom, so the car keeps the rest. */
#garage-screen[data-page="home"] .garage-visual { display: grid; grid-template-columns: auto minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; align-items: center; gap: 4px 8px; }
#garage-screen[data-page="home"] .garage-preview { grid-column: 1 / -1; align-self: stretch; }
#garage-screen[data-page="home"] .garage-mode-controls { grid-area: 2 / 1; }
#garage-screen[data-page="home"] #showcase-camera-dock { grid-area: 2 / 2; justify-self: end; padding: 0; }
#garage-screen[data-page="home"] :is(.garage-mode-label, .showcase-camera-heading, .showcase-camera-dots) { display: none; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen[data-page="home"] .garage-visual { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto auto; }
  #garage-screen[data-page="home"] #showcase-camera-dock { grid-area: 3 / 1; justify-self: stretch; }
  #garage-screen[data-page="home"] .garage-collection { flex-basis: 34%; } /* the paint list scrolls; the car gets the height */
}

/* Unified Garage Collection polish: one shared themed surface for paint and VFX cards. */
#garage-screen .garage-collection {
  background: linear-gradient(160deg, #102439, #081724 74%);
  border: 1px solid #3b5d74; box-shadow: inset 0 1px #ffffff19, 0 12px 30px #0005;
  scrollbar-color: #52748b #0b1928;
}
#garage-screen .garage-collection h3 {
  display: flex; align-items: center; gap: 9px;
  font-size: 14px; line-height: 1.55; letter-spacing: .07em;
  color: #e7f7ff; text-shadow: 0 0 16px #60baff42;
}
#garage-screen .garage-collection h3::before {
  content: ''; height: 17px; width: 4px; flex: 0 0 auto; border-radius: 3px;
  background: linear-gradient(#a0eaff, #8469ff);
  box-shadow: 0 0 10px #5ddfff8c;
}
#garage-screen .garage-collection :is(.paint-options button, .garage-vfx-category .garage-skin-card) {
  --garage-card-surface:
    radial-gradient(ellipse at 50% 19%, hsl(var(--card-hue, 195) 72% 39% / .25), transparent 74%),
    linear-gradient(155deg, #1c2e4a, #0c192c 86%);
  --garage-card-border: hsl(var(--card-hue, 195) 69% 61% / .48);
  background: var(--garage-card-surface);
  border: 1px solid var(--garage-card-border);
  border-radius: 14px 6px 14px 6px; color: #edf7ff;
  box-shadow: inset 0 1px #ffffff16, 0 5px 15px #0005;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
#garage-screen .paint-options button { --card-hue: 194; min-height: 112px; padding: 9px; gap: 7px; }
#garage-screen .paint-options button i { height: 43px; border-radius: 11px 3px 11px 3px;
  border: 1px solid #cee9ff71; box-shadow: inset -14px -8px 20px #0005, inset 8px 8px 16px #fff4,
  0 0 8px #5abffc33; }
#garage-screen .paint-options button .garage-paint-name {
  line-height: 1.5; font-size: 12px; font-weight: 800; overflow-wrap: anywhere;
}
#garage-screen .paint-options button .garage-paint-badge {
  align-self: center; border-radius: 999px; padding: 2px 9px; font-size: 11px;
  color: #b7e8ff; background: #1c48687a; border: 1px solid #66d9ff3f;
}
#garage-screen .paint-options button[aria-pressed="true"] {
  border-color: #82e9ff; outline: 1px solid #70daffbd;
  box-shadow: 0 0 0 1px #46d9ff44, 0 0 19px #31a9ff57, inset 0 0 11px #28aaff24;
}
#garage-screen .paint-options button[data-state="equipped"] .garage-paint-badge {
  color: #75f7dc; background: #063e406b; border-color: #32bda48f;
}
#garage-screen .paint-options button[data-state="locked"] {
  --card-hue: 214; border-style: solid; filter: saturate(.7);
}
#garage-screen .garage-collection :is(.controls-reset, .garage-restore) {
  border-radius: 12px 4px 12px 4px; font-weight: 800; letter-spacing: .025em;
  box-shadow: inset 0 1px #ffffff48, 0 5px 12px #0005;
  transition: transform .16s ease, filter .16s ease, box-shadow .16s ease;
}
#garage-screen .garage-collection .controls-reset:not(:disabled) {
  background: linear-gradient(125deg, #62e9f6, #1b9dcc);
  color: #082134; border-color: #a1f7ff;
}
#garage-screen .garage-collection .garage-restore {
  background: linear-gradient(125deg, #2c3b62, #172d46);
  border-color: #607db3; color: #daebff;
}
#garage-screen .garage-collection :is(.collection-note, .garage-coming) {
  line-height: 1.55; overflow-wrap: anywhere;
}
#garage-screen .garage-collection :is(button, .garage-skin-preview-hitarea):focus-visible {
  outline: 3px solid #74eaff; outline-offset: 3px;
}
@media (hover: hover) and (pointer: fine) {
  #garage-screen .garage-collection .paint-options button:hover {
    transform: translateY(-3px); border-color: #85e9ff;
    box-shadow: 0 8px 19px #0009, 0 0 16px #4dd5ff48;
  }
  #garage-screen .garage-collection :is(.controls-reset:not(:disabled), .garage-restore):hover {
    filter: brightness(1.16); transform: translateY(-1px);
  }
}
@media (hover: none) {
  #garage-screen .garage-collection :is(.paint-options button, .controls-reset):active {
    transform: scale(.985);
  }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen .paint-options button { min-height: 94px; }
}

</style>

<style>
/* Larger car-body previews replace the old 26–43px swatch. */
#garage-screen .paint-options { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
#garage-screen .paint-options button { min-width: 0; min-height: 144px; padding: 7px; gap: 8px; }
#garage-screen .garage-paint-meta { min-width: 0; display: flex; flex-wrap: wrap; align-items: center;
  justify-content: space-between; gap: 5px; padding: 0 2px 3px; }
#garage-screen .garage-paint-name { font-size: 12px; line-height: 1.25; text-align: left; }
#garage-screen .paint-options button .garage-paint-badge { align-self: auto; font-size: 10px; white-space: nowrap; padding: 2px 6px; }
#garage-screen .paint-options button[data-state="locked"] { filter: none; }
#garage-screen .paint-options button[data-state="locked"] .garage-paint-preview { filter: saturate(.88); }
#garage-screen .paint-options button[aria-pressed="true"] .garage-paint-preview { border-color: #91ecff; box-shadow: 0 0 14px #13d7ff3c; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen .paint-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #garage-screen .paint-options button { min-height: 135px; }
  #garage-screen .garage-collection { flex-basis: 43%; }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen .paint-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #garage-screen .paint-options button { min-height: 128px; }
  #garage-screen .garage-paint-preview { min-height: 78px; }
}
</style>

<style>
/* Live badges overlay native @3x art: visually match the premium Garage cards. */
#garage-screen .garage-collection {
  background: radial-gradient(ellipse at 75% 2%, #123858b3, transparent 49%), linear-gradient(155deg, #081e32, #071321 76%);
  border-color: #246c98; border-radius: 18px;
  box-shadow: inset 0 1px #75d9ff36, 0 16px 36px #00132389;
}
#garage-screen .paint-options { gap: 8px; }
#garage-screen .paint-options button {
  background: linear-gradient(180deg, #0c2e49, #071828 83%); border: 1px solid #327eaf;
  border-radius: 15px; padding: 4px; gap: 0; min-height: 0; overflow: hidden;
  box-shadow: inset 0 1px #5ad9ff45, 0 4px 14px #0008;
}
#garage-screen .paint-options button .garage-paint-preview { border: 0; border-radius: 10px 10px 3px 3px; }
#garage-screen .paint-options .garage-paint-meta {
  padding: 7px 6px 8px; gap: 4px; min-height: 44px;
  background: linear-gradient(120deg, #0a3048ef, #071b2cfa); border-top: 1px solid #57dfff62;
}
#garage-screen .paint-options .garage-paint-name {
  color: #f5fbff; font-size: clamp(11px, 1.6vw, 14px); font-weight: 850; text-shadow: 0 1px 3px #000e;
}
#garage-screen .paint-options .garage-paint-name::before {
  content: "//"; margin-right: 5px; color: #13d8ff; font-weight: 900; letter-spacing: -.13em;
}
#garage-screen .paint-options button .garage-paint-badge {
  font-weight: 800; line-height: 1.4; color: #bdeaff; background: #042a46c9;
  border: 1px solid #51bfe6; box-shadow: inset 0 0 8px #39e4ff10;
}
#garage-screen .paint-options button[data-state="equipped"] .garage-paint-badge {
  color: #65ffe3; background: #023f38bb; border-color: #15d5a9;
}
#garage-screen .paint-options button[data-state="equipped"]::before {
  content: "✓"; position: absolute; z-index: 4; left: 4px; top: 4px;
  width: 27px; height: 27px; display: grid; place-items: center;
  color: #81ffe3; background: #007a69db; font-size: 19px; font-weight: 900;
  border: 1px solid #39f6c4; border-radius: 8px 0 10px 0;
}
#garage-screen .paint-options button[data-state="locked"] { filter: none; border-color: #426b8c; }
#garage-screen .paint-options button[data-state="locked"] .garage-paint-preview { filter: none; }
#garage-screen .paint-options button[data-state="locked"] .garage-paint-badge {
  color: #ffdb9e; border-color: #d6ae71; background: #3a251d72;
}
#garage-screen .paint-options button[aria-pressed="true"] {
  outline: 1px solid #75efff; border-color: #1af4ff;
  box-shadow: 0 0 0 2px #02c9e755, 0 0 19px #06d3f680, inset 0 1px #b3ffffa0;
}
#garage-screen .paint-options button:focus-visible { outline: 3px solid #dbffff; outline-offset: 2px; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen .paint-options { gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  #garage-screen .paint-options button { min-height: 0; padding: 3px; }
  #garage-screen .paint-options .garage-paint-meta { min-height: 46px; flex-wrap: wrap; padding: 6px 4px; }
  #garage-screen .paint-options .garage-paint-name { font-size: 12px; }
  #garage-screen .paint-options button .garage-paint-badge { font-size: 10px; }
}
</style>

<style>
/* Compact Garage/Studio: preserve 44px touch targets, maximise the real WebGL viewport. */
#garage-screen .garage-collection :is(.collection-note, .garage-coming) { margin-block: 5px; line-height: 1.4; }
#garage-screen .garage-vfx-catalog { margin-top: 8px; padding-top: 7px; }
#garage-screen .garage-vfx-category { margin-block: 8px; }
#garage-screen .garage-vfx-category ul { gap: 7px; }
#garage-screen .garage-vfx-message { margin-block: 5px 7px; }
#garage-screen .garage-collection .garage-art-showcase { margin-top: 10px; padding-top: 8px; }
#garage-screen .garage-entry { white-space: normal; overflow-wrap: break-word; }
#garage-screen .garage-camera-controls { overscroll-behavior-inline: contain; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen .garage-entry { max-width: 49vw; padding-inline: 6px; font-size: 11px; }
  #garage-screen .garage-heading h2 { font-size: 18px; }
  #garage-screen .garage-mode-controls button { min-width: 0; padding-inline: 9px; }
}
</style>
