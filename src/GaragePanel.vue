<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
import { garageStudioView, garageView } from './garage-view-state.ts';
import { GARAGE_POSE_ART } from './lobby-art.ts';
import { GARAGE_ANGLES } from './garage-camera.ts';
import { ICON_ATTRS, icons } from './icons.ts';
import { PAINTS } from './appearance.ts';
import GarageCarPicker from './GarageCarPicker.vue';
import CloseButton from './CloseButton.vue';
import GaragePaintPreview from './GaragePaintPreview.vue';
import GarageSourceArtGallery from './GarageSourceArtGallery.vue';
import GarageMissionBoard from '#wave3-demo-mission-ui';
import { wave3DemoExperience } from '#wave3-demo-race';
import Wave3DemoEntry from '#wave3-demo-ui';
import GarageArtworkImage from './GarageArtworkImage.vue';
import GarageLightingToggle from './GarageLightingToggle.vue';
import GarageEffectsToggle from './GarageEffectsToggle.vue';
import GarageSkinCatalog from '#garage-skin-ui';
import { GARAGE_RELEASE_MODE } from '#garage-release-config';
const locale = ref(getLocale());
const storeCatalog = ref<{ openStore: () => void } | null>(null);
const demo = ref<{ navigate: (page: 'home' | 'store' | 'collection', interactive?: boolean) => void } | null>(null);
const sections = ['cars', 'paints', 'effects', 'missions', 'store', 'collection'] as const;
const section = ref<(typeof sections)[number]>('cars');
const catalog = ref<HTMLElement>();
const claimable = ref(0);
function selectSection(next: typeof section.value): void {
  section.value = next;
  if (next === 'store' && GARAGE_RELEASE_MODE === 'trial') demo.value?.navigate('store');
  if (next === 'collection') demo.value?.navigate('collection');
  if (catalog.value) catalog.value.scrollTop = 0;
}
function resetGarage(): void {
  selectSection('cars');
  demo.value?.navigate('home', false);
}

const storeIcon = `${import.meta.env.BASE_URL}feature-assets/garage-store-readiness/raster/store-cart@3x.webp`;
let unsubscribe: (() => void) | undefined;
onMounted(() => {
  unsubscribe = onLocaleChange(value => { locale.value = value; });
});
onUnmounted(() => unsubscribe?.());
const copy = computed(() => locale.value === 'zh-TW' ? {
  showroom: '3D 車輛展示間', title: '預覽工作室', open: '開啟全螢幕預覽', back: '返回車庫',
  hint: '拖曳旋轉，雙指或滾輪縮放', angles: ['車頭', '車尾', '側面', '俯視', '斜後方'], free: '自由視角', angle: '鏡頭角度', prevAngle: '上一個角度', nextAngle: '下一個角度',
  left: '向左旋轉', right: '向右旋轉', zoomIn: '放大', zoomOut: '縮小',
  auto: '環繞', reset: '重設鏡頭', undo: '復原車漆', ground: '平地', flight: '飛行', wing: '尾翼', collection: '車漆收藏',
  coming: GARAGE_RELEASE_MODE === 'coming-soon' ? '外觀特效即將推出' : GARAGE_RELEASE_MODE === 'trial' ? '外觀特效免費試用中：重新載入後記住此帳號最後的選擇；不代表永久擁有' : '外觀特效已開放，裝備須具備擁有權', equipped: '已裝備', owned: '已擁有', locked: '未解鎖',
  cosmetic: '外觀不影響車輛性能', restore: '恢復預設車漆',
  preview: '試看', previewing: '試看中', cars: '車款', paints: '車漆', effects: '特效', missions: '任務',
  store: GARAGE_RELEASE_MODE === 'trial' ? '試玩商城' : '商店展示', collectionTab: '試玩收藏', ready: '項可領取',
} : {
  showroom: '3D vehicle showroom', title: 'PREVIEW STUDIO', open: 'Open full-screen Studio', back: 'Back to Garage',
  hint: 'Drag to rotate. Pinch or scroll to zoom.', angles: ['Front', 'Rear', 'Side', 'Top', '3/4 view'], free: 'Free view', angle: 'Camera angle', prevAngle: 'Previous angle', nextAngle: 'Next angle',
  left: 'Rotate left', right: 'Rotate right', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  auto: 'Orbit', reset: 'Reset camera', undo: 'Undo paint', ground: 'Ground', flight: 'Flight', wing: 'Wing', collection: 'Paint collection',
  coming: GARAGE_RELEASE_MODE === 'coming-soon' ? 'Cosmetic VFX coming soon' : GARAGE_RELEASE_MODE === 'trial' ? 'Try VFX for free. Your last pick is remembered on reload for this account; no permanent ownership.' : 'Cosmetic VFX is available; equip requires ownership', equipped: 'Equipped', owned: 'Owned', locked: 'Locked',
  cosmetic: 'Appearance does not change performance', restore: 'Restore default paint',
  preview: 'Preview', previewing: 'Previewing', cars: 'Cars', paints: 'Paints', effects: 'Effects', missions: 'Missions',
  store: GARAGE_RELEASE_MODE === 'trial' ? 'Demo Store' : 'Store Preview', collectionTab: 'Collection', ready: 'ready to claim',
});
const angleName = computed(() => copy.value.angles[GARAGE_ANGLES.indexOf(garageStudioView.angle as typeof GARAGE_ANGLES[number])] ?? copy.value.free);
const nextPose = computed(() => garageStudioView.mode === 'flight' ? 'ground' : 'flight');
const sectionLabel = (id: typeof section.value) => id === 'collection' ? copy.value.collectionTab : copy.value[id];
const paintState = (id: string) => id === garageStudioView.equippedPaint ? 'equipped'
  : garageStudioView.ownedPaints.includes(id) ? 'owned' : 'locked';

const isPreviewingPaint = (id: string): boolean =>
  id === garageView.selected && id !== garageStudioView.equippedPaint;
</script>

<template>
  <dialog id="garage-screen" @close="resetGarage" class="history-screen garage-screen" :data-page="garageStudioView.page" aria-labelledby="garage-title">
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
        <GarageEffectsToggle :locale="locale" />
        <div class="garage-preview-controls">
          <div class="garage-mode-controls">
            <button id="garage-pose-action" type="button" role="switch" :aria-label="copy.flight"
              :aria-checked="garageStudioView.mode === 'flight'" :data-garage-mode="nextPose">
              <span v-for="pose in (['ground', 'flight'] as const)" :key="pose" :data-active="pose === garageStudioView.mode" aria-hidden="true">
                <svg v-bind="ICON_ATTRS" viewBox="0 0 34 23"><path :d="GARAGE_POSE_ART.car"/><path :d="GARAGE_POSE_ART[pose]"/></svg>
                {{ copy[pose] }}
              </span>
            </button>
            <button type="button" id="garage-wing" role="switch" :aria-checked="garageStudioView.wing">
              {{ copy.wing }}<span class="garage-switch-track" aria-hidden="true"></span>
            </button>
            <GarageLightingToggle :locale="locale" />
          </div>
        </div>
        <nav v-show="garageStudioView.page === 'studio'" class="garage-camera-controls" :aria-label="locale === 'zh-TW' ? '鏡頭控制' : 'Camera controls'">
          <div class="garage-camera-actions">
            <button type="button" id="garage-auto-rotate" :aria-pressed="garageStudioView.autoRotate" :aria-label="copy.auto" :title="copy.auto"><svg v-bind="ICON_ATTRS" v-html="icons.cameraOrbit"></svg></button>
            <button type="button" id="garage-zoom-out" :aria-label="copy.zoomOut" :title="copy.zoomOut"><svg v-bind="ICON_ATTRS" v-html="icons.zoomOut"></svg></button>
            <button type="button" id="garage-zoom-in" :aria-label="copy.zoomIn" :title="copy.zoomIn"><svg v-bind="ICON_ATTRS" v-html="icons.zoomIn"></svg></button>
            <button type="button" id="garage-reset" :aria-label="copy.reset" :title="copy.reset"><svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg></button>
          </div>
          <div class="garage-camera-angles">
            <span class="garage-angle-stepper" role="group" :aria-label="copy.angle">
              <button type="button" id="garage-angle-prev" :aria-label="copy.prevAngle">‹</button>
              <span id="garage-angle-name" :data-angle="garageStudioView.angle || undefined" role="status" aria-live="polite">{{ angleName }}</span>
              <button type="button" id="garage-angle-next" :aria-label="copy.nextAngle">›</button>
            </span>
            <button type="button" id="garage-rotate-left" :aria-label="copy.left" :title="copy.left"><svg v-bind="ICON_ATTRS" v-html="icons.undo"></svg></button>
            <button type="button" id="garage-rotate-right" :aria-label="copy.right" :title="copy.right"><svg v-bind="ICON_ATTRS" v-html="icons.redo"></svg></button>
          </div>
        </nav>
      </section>
      <aside class="garage-collection">
        <nav class="garage-section-nav" :aria-label="locale === 'zh-TW' ? '車庫分類' : 'Garage sections'">
          <button v-for="id in sections" v-show="id !== 'collection' || GARAGE_RELEASE_MODE === 'trial'"
            :key="id" type="button" :data-garage-section="id" :aria-pressed="section === id"
            :data-wave3-open-store="id === 'store' && GARAGE_RELEASE_MODE === 'trial' ? '' : undefined"
            :data-wave3-open-collection="id === 'collection' && GARAGE_RELEASE_MODE === 'trial' ? '' : undefined"
            aria-controls="garage-catalog-scroll" :aria-label="sectionLabel(id)"
            :aria-describedby="id === 'missions' && claimable ? 'garage-claim-count' : undefined" @click="selectSection(id)">
            <span>{{ sectionLabel(id) }}</span>
            <small v-if="id === 'missions' && claimable" id="garage-claim-count" class="garage-claim-count" role="status">{{ claimable }} {{ copy.ready }}</small>
          </button>
        </nav>
        <div id="garage-catalog-scroll" ref="catalog" class="garage-catalog-scroll">
          <GarageCarPicker v-show="section === 'cars'" :locale="locale" />
          <section v-show="section === 'paints'" class="garage-paints">
            <h3>{{ copy.collection }}</h3>
            <div class="paint-options" role="group" aria-label="Preview car finish" data-i18n-aria-label="garage.finishes">
              <button v-for="(paint, id) in PAINTS" :key="id" type="button" :data-paint="id"
                :data-state="paintState(id)" :aria-pressed="id === garageView.selected"
                :aria-label="`${isPreviewingPaint(id) ? copy.previewing : copy.preview} ${t('paint.' + id, undefined, locale)} · ${copy[paintState(id)]}`">
                <GaragePaintPreview :id="id" :color="paint.paint" />
                <span v-if="isPreviewingPaint(id)" class="garage-preview-badge" aria-hidden="true">{{ copy.previewing }}</span>
                <span class="garage-paint-meta">
                  <span class="garage-paint-name" :data-i18n="`paint.${id}`">{{ t('paint.' + id, undefined, locale) }}</span>
                  <span class="garage-paint-badge">{{ copy[paintState(id)] }}</span>
                </span>
              </button>
            </div>
          </section>
          <section v-show="section === 'effects'">
            <p class="garage-coming">{{ copy.coming }}</p>
            <GarageSkinCatalog :locale="locale" :active="section === 'effects'" />
            <p class="garage-cosmetic">{{ copy.cosmetic }}</p>
          </section>
          <section v-show="section === 'missions'">
            <GarageMissionBoard :experience="GARAGE_RELEASE_MODE === 'trial' ? wave3DemoExperience : null"
              @claimable="claimable = $event" />
            <GarageSourceArtGallery category="garage-rewards-and-missions" />
          </section>
          <Wave3DemoEntry v-if="GARAGE_RELEASE_MODE === 'trial'" v-show="section === 'store' || section === 'collection'"
            ref="demo" :locale="locale" embedded @navigate="page => { if (page !== 'home') section = page; }" />
          <section v-show="section === 'store'" class="garage-store-concepts">
            <section class="garage-store-entry" data-garage-store-entry
              :aria-label="locale === 'zh-TW' ? '車庫商店' : 'Garage Store concepts'">
              <GarageArtworkImage :src="storeIcon" :size="52" alt=""
                :fallback-text="locale === 'zh-TW' ? '商店' : 'Store'" loading="eager" />
              <div class="garage-store-entry-copy">
                <strong>{{ locale === 'zh-TW' ? '商店 · 即將推出' : 'Garage Store · Coming Soon' }}</strong>
                <span>{{ locale === 'zh-TW' ? '瀏覽未來的外觀、組合與收藏。' : 'Preview future cosmetics, bundles and collections.' }}</span>
              </div>
              <button type="button" data-garage-store-open @click="storeCatalog?.openStore()">
                {{ locale === 'zh-TW' ? '瀏覽商店概念' : 'Browse Store' }}
              </button>
            </section>
            <GarageSourceArtGallery ref="storeCatalog" category="garage-store-readiness" />
          </section>
        </div>
        <footer v-show="section === 'paints'" class="garage-paint-actions">
          <p id="garage-status" class="collection-note" role="status">{{ garageView.status }}</p>
          <button id="garage-equip" type="button" class="controls-reset" :disabled="garageView.equipDisabled"
            aria-label="Equip finish" data-i18n-aria-label="garage.equip">{{ garageView.equipLabel }}</button>
          <button v-show="garageView.canUndo" id="garage-paint-undo" type="button" class="garage-restore">{{ copy.undo }}</button>
          <button v-show="garageStudioView.page === 'studio' && !garageView.canUndo" id="garage-restore-default" type="button"
            class="garage-restore">{{ copy.restore }}</button>
        </footer>
      </aside>
    </div>
  </dialog>
</template>

<style src="./garage-store-entry.css"></style>
<style src="./garage-studio-entry.css"></style>
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
/* Preserve both 96px artwork columns after the catalog's padding and scrollbar. */
#garage-screen .garage-layout { min-height: 0; flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) clamp(272px, 27vw, 400px); gap: 8px; }
#garage-screen .garage-visual { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 4px; }
#garage-screen .garage-preview { flex: 1; position: relative; min-height: 110px; height: auto; margin: 0; border: 1px solid #42596c; border-radius: 12px; overflow: hidden; touch-action: none; background: #081c2e; }
#garage-screen #world { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
#garage-screen .garage-hint { position: absolute; z-index: 2; bottom: 8px; left: 8px; max-width: calc(100% - 16px); margin: 0; padding: 4px 8px; border-radius: 6px; background: #071725b8; color: #c2d4e3; font-size: 11px; pointer-events: none; }
#garage-screen .garage-camera-controls { display: flex; flex: none; gap: 6px; white-space: nowrap; }
#garage-screen :is(.garage-camera-actions, .garage-camera-angles) { display: flex; gap: 4px; }
#garage-screen .garage-camera-actions { flex: none; }
#garage-screen .garage-camera-angles { flex: 1; min-width: 0; overflow-x: auto; scrollbar-width: thin; overscroll-behavior-inline: contain; }
#garage-screen .garage-camera-controls button { min-width: 44px; flex: none; }
#garage-screen .garage-camera-controls button[aria-pressed="true"] { border-color: var(--accent); background: #35485d; }
/* Studio angle: ‹ name › like the Home/Garage camera dock; the name keeps one width so the arrows never jump. */
#garage-screen .garage-angle-stepper { display: flex; flex: none; align-items: center; gap: 4px; }
#garage-screen .garage-camera-controls .garage-angle-stepper > button { width: 44px; padding: 0; font-size: 22px; line-height: 1; }
#garage-angle-name { min-width: 6.5em; text-align: center; font-size: 13px; font-weight: 700; color: #dfeef7; }
#garage-screen .garage-collection { display: flex; flex-direction: column; min-height: 0; min-width: 0; gap: 6px; }
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
  #garage-screen .garage-camera-controls { flex-direction: column; }
  #garage-screen .garage-camera-actions button { flex: 1; }
  #garage-screen .garage-camera-controls button { padding-inline: 8px; font-size: 12px; }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen.garage-screen { gap: 5px; padding-block: 5px; }
  #garage-screen .garage-layout { grid-template-columns: minmax(0, 1fr) minmax(180px, 260px); gap: 8px; }
  #garage-screen .garage-hint { display: none; }
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
  #garage-screen .garage-camera-controls button { min-width: 44px; min-height: 44px; font-size: 12px; padding: 5px; }
  #garage-screen .paint-options button { min-height: 78px; }
  #garage-screen .paint-options button i { height: 26px; }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen[data-page="studio"] .garage-layout { grid-template-columns: minmax(0, 1fr) minmax(210px, 33%); }
  #garage-screen .garage-collection { padding: 6px; }
  #garage-screen .garage-camera-controls button { flex: none; min-height: 44px; }
  #garage-screen .garage-paint-badge { font-size: 10px; }
}

@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen[data-page="home"] .garage-collection { flex-basis: 34%; } /* the paint list scrolls; the car gets the height */
}

</style>

<style src="./garage-card-styles.css"></style>

<style src="./garage-compact-layout.css"></style>

<style src="./garage-section-layout.css"></style>
<style src="./garage-preview-controls.css"></style>
