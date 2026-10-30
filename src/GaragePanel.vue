<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { getLocale, onLocaleChange } from './i18n.ts';
import { garageStudioView } from './garage-view-state.ts';
import { PAINTS } from './appearance.ts';
import { garageView } from './garage-view-state.ts';
import CloseButton from './CloseButton.vue';
const locale = ref(getLocale());
let unsubscribe: (() => void) | undefined;
onMounted(() => { unsubscribe = onLocaleChange(value => { locale.value = value; }); });
onUnmounted(() => unsubscribe?.());
const copy = computed(() => locale.value === 'zh-TW' ? {
  title: '預覽工作室', open: '開啟全螢幕預覽', back: '返回車庫',
  hint: '拖曳旋轉，雙指或滾輪縮放', angles: ['車頭', '車尾', '側面', '俯視', '斜後方'],
  left: '向左旋轉', right: '向右旋轉', zoomIn: '放大', zoomOut: '縮小',
  auto: '自動旋轉', reset: '重設鏡頭', collection: '車漆收藏',
  coming: '新外觀與特效・即將推出',
} : {
  title: 'PREVIEW STUDIO', open: 'Open full-screen Studio', back: 'Back to Garage',
  hint: 'Drag to rotate. Pinch or scroll to zoom.', angles: ['Front', 'Rear', 'Side', 'Top', '3/4 view'],
  left: 'Rotate left', right: 'Rotate right', zoomIn: 'Zoom in', zoomOut: 'Zoom out',
  auto: 'Auto rotate', reset: 'Reset camera', collection: 'Paint collection',
  coming: 'New skins and effects · Coming soon',
});
const angles = ['front', 'rear', 'side', 'top', 'cinematic'] as const;
</script>

<template>
  <dialog id="garage-screen" class="history-screen garage-screen" :data-page="garageStudioView.page" aria-labelledby="garage-title">
    <header class="garage-heading">
      <button v-show="garageStudioView.page === 'studio'" id="garage-studio-back" type="button" :aria-label="copy.back">‹ {{ copy.back }}</button>
      <h2 id="garage-title">{{ garageStudioView.page === 'studio' ? copy.title : (locale === 'zh-TW' ? '車庫' : 'Garage') }}</h2><CloseButton id="garage-close" label="Close garage" data-i18n-aria-label="garage.close" /></header>
    <p class="collection-note garage-intro" v-show="garageStudioView.page === 'home'" data-i18n="garage.intro">Explore paint and tail light combinations. Appearance never changes performance.</p>
    
    <button id="garage-studio-open" v-show="garageStudioView.page === 'home'" type="button" class="garage-entry">{{ copy.open }} ↗</button>
    <div class="garage-layout">
      <section class="garage-visual">
        <div id="garage-preview" class="garage-preview" tabindex="0" role="group" :aria-label="copy.hint" aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown + -"></div>
        <p v-show="garageStudioView.page === 'studio'" class="garage-hint">{{ copy.hint }}</p>
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
    <div class="paint-options" role="group" aria-label="Preview car finish" data-i18n-aria-label="garage.finishes"><button v-for="(paint, id) in PAINTS" :data-paint="id" :aria-label="`Preview ${id}`" :data-i18n-aria-label="`paint.${id}.preview`" :aria-pressed="id === garageView.selected" :key="id"><i :style="{ backgroundColor: paint.paint }" aria-hidden="true"></i><span :data-i18n="`paint.${id}`">{{ paint.name }}</span></button></div>
    <p id="garage-status" class="collection-note" role="status">{{ garageView.status }}</p>
    <button id="garage-equip" class="controls-reset" :disabled="garageView.equipDisabled" aria-label="Equip finish" data-i18n-aria-label="garage.equip">{{ garageView.equipLabel }}</button>
        <p class="collection-note" data-i18n="garage.previewNote">Additional finishes are previews. Cosmetic unlocks are not available yet.</p>
        <p class="garage-coming">{{ copy.coming }}</p>
      </aside>
    </div>
  </dialog>
</template>

<style>
#garage-screen.garage-screen { position: fixed; inset: 0; width: 100vw; max-width: none; height: 100dvh; max-height: none; margin: 0; border-radius: 0; padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); overflow: hidden; display: none; flex-direction: column; gap: 12px; }
#garage-screen.garage-screen[open] { display: flex; }
#garage-screen .garage-heading { display: flex; align-items: center; gap: 12px; flex: none; }
#garage-screen .garage-heading h2 { margin: 0; flex: 1; font-size: clamp(20px, 3vw, 30px); }
#garage-screen .garage-heading > button:not(.close-button), #garage-screen .garage-camera-controls button, #garage-screen .garage-entry { min-height: 44px; border: 1px solid #698297; border-radius: 6px; background: #1b3044; padding: 8px 12px; }
#garage-screen .garage-entry { flex: none; align-self: flex-start; border-color: var(--accent); font-weight: 700; }
#garage-screen .garage-intro { margin: 0; font-size: 13px; }
#garage-screen .garage-layout { min-height: 0; flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 310px); gap: 18px; }
#garage-screen .garage-visual { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 8px; }
#garage-screen .garage-preview { flex: 1; position: relative; min-height: 110px; height: auto; margin: 0; border: 1px solid #42596c; border-radius: 12px; overflow: hidden; touch-action: none; background: #081c2e; }
#garage-screen #world { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; }
#garage-screen .garage-hint { text-align: center; margin: 0; font-size: 12px; color: #c2d4e3; }
#garage-screen .garage-camera-controls { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; }
#garage-screen .garage-camera-controls button { min-width: 44px; }
#garage-screen .garage-camera-controls button[aria-pressed="true"] { border-color: var(--accent); background: #35485d; }
#garage-screen .garage-collection { min-height: 0; overflow-y: auto; scrollbar-gutter: stable; }
#garage-screen .garage-collection h3 { font-size: 14px; letter-spacing: .1em; }
#garage-screen .paint-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
#garage-screen .garage-collection .controls-reset { margin: 12px 0; }
#garage-screen .garage-coming { color: #c2d4e3; font-size: 12px; border: 1px dashed #698297; border-radius: 6px; padding: 10px; }
#garage-screen[data-page="home"] .garage-layout { max-width: 1150px; width: 100%; margin: auto; }
@media (max-width: 650px) and (orientation: portrait) {
  #garage-screen .garage-layout { display: flex; flex-direction: column; gap: 8px; }
  #garage-screen .garage-visual { flex: 1 1 50%; }
  #garage-screen .garage-collection { flex: 0 1 36%; }
  #garage-screen .paint-options { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  #garage-screen .garage-camera-controls { max-height: 118px; overflow-y: auto; }
  #garage-screen .garage-camera-controls button { padding-inline: 8px; font-size: 12px; }
}
@media (max-height: 420px) and (orientation: landscape) {
  #garage-screen.garage-screen { gap: 5px; padding-block: 5px; }
  #garage-screen .garage-layout { grid-template-columns: minmax(0, 1fr) minmax(180px, 260px); gap: 8px; }
  #garage-screen .garage-hint { display: none; }
  #garage-screen .garage-camera-controls { max-height: 72px; overflow-y: auto; }
  #garage-screen .garage-camera-controls button { font-size: 11px; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) { #garage-screen, #garage-screen * { animation: none !important; transition: none !important; } }
</style>
