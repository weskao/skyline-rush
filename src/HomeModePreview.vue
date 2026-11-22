<script setup lang="ts">
import { computed, onUnmounted, shallowRef } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
import { MODE_ART } from './lobby-art.ts';
import { modeRulesSummary } from './mode-setup.ts';
import { racePresentationView } from './race-presentation-ui.ts';

const locale = shallowRef(getLocale());
onUnmounted(onLocaleChange(value => { locale.value = value; }));
const translate = (key: string, params?: Record<string, unknown>) => t(key, params, locale.value);
const mode = computed(() => racePresentationView.lobbyMode);
const title = computed(() => translate('mode.' + mode.value));
const description = computed(() => translate('mode.description.' + mode.value));
const icon = computed(() => MODE_ART[mode.value as keyof typeof MODE_ART] ?? MODE_ART.classic);
const summary = computed(() => {
  const setup = racePresentationView.setup;
  return setup ? mode.value === 'eventlab'
    ? description.value : modeRulesSummary(setup.config, translate) : '';
});
const SCENES: Readonly<Record<string, string>> = {
  classic: 'grid', custom: 'grid', free: 'open', time: 'timer',
  gauntlet: 'obstacles', checkpoint: 'gates', cup: 'grid', stunt: 'tricks',
  endless: 'open', circuit: 'loop', elimination: 'grid', eventlab: 'builder',
};
const scene = computed(() => SCENES[mode.value] ?? 'grid');
</script>

<template>
  <aside id="home-mode-preview" class="home-mode-preview" :data-mode="mode" :data-scene="scene"
    :aria-label="`${translate('mode.homePreview')}: ${title}`" role="status" aria-live="polite">
    <div class="home-mode-preview__heading">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" v-html="icon"></svg>
      <div><small>{{ translate('mode.homePreview') }}</small><strong id="home-mode-preview-title">{{ title }}</strong></div>
    </div>
    <div class="home-mode-preview__stage" aria-hidden="true">
      <span class="home-mode-preview__road"><i></i><i></i></span>
      <span class="home-mode-preview__hero"></span>
      <span v-for="n in 3" :key="n" class="home-mode-preview__marker" :class="`marker-${n}`"></span>
    </div>
    <p id="home-mode-preview-description">{{ description }}</p>
    <small id="home-mode-preview-rules">{{ summary }}</small>
  </aside>
</template>

<style scoped>
.home-mode-preview {
  --mode-accent: #ffbd95;
  position: fixed;
  z-index: 1;
  top: calc(140px + var(--safe-top, 0px));
  right: max(14px, var(--safe-right, 0px));
  box-sizing: border-box;
  width: min(250px, calc(100vw - 32px));
  padding: 11px;
  border: 1px solid color-mix(in srgb, var(--mode-accent) 56%, transparent);
  border-radius: 11px;
  background: linear-gradient(145deg, #0a2534e8, #06111ccf);
  box-shadow: 0 8px 28px #0007;
  color: #eef8ff;
  pointer-events: none;
}
.home-mode-preview[data-mode="free"], .home-mode-preview[data-mode="endless"] { --mode-accent: #7de9c5; }
.home-mode-preview[data-mode="time"], .home-mode-preview[data-mode="checkpoint"] { --mode-accent: #92e3ff; }
.home-mode-preview[data-mode="gauntlet"], .home-mode-preview[data-mode="elimination"] { --mode-accent: #ff9c9c; }
.home-mode-preview[data-mode="stunt"], .home-mode-preview[data-mode="eventlab"] { --mode-accent: #d7b0ff; }
.home-mode-preview[data-mode="cup"], .home-mode-preview[data-mode="circuit"] { --mode-accent: #ffdf8e; }
:global(body:not([data-phase="ready"]) .home-mode-preview) { display: none; }
.home-mode-preview__heading { display: flex; align-items: center; gap: 9px; }
.home-mode-preview__heading svg { width: 28px; height: 28px; flex: none; color: var(--mode-accent); }
.home-mode-preview__heading > div { min-width: 0; display: grid; gap: 2px; }
.home-mode-preview__heading small { color: var(--mode-accent); font: 800 9px/1.1 system-ui, sans-serif; letter-spacing: .12em; }
.home-mode-preview__heading strong { font: 800 16px/1.15 'Barlow Condensed', system-ui, sans-serif; }
.home-mode-preview__stage {
  position: relative;
  overflow: hidden;
  height: 47px;
  margin-top: 9px;
  border: 1px solid #80bac345;
  border-radius: 5px;
  background: linear-gradient(180deg, #20445d82, #12232aee);
}
.home-mode-preview__road { position: absolute; inset: -12px 19% -8px; transform: perspective(95px) rotateX(40deg); background: #2b3a4a; border-inline: 2px solid #94d7e080; }
.home-mode-preview__road i { position: absolute; top: 0; bottom: 0; width: 1px; background: repeating-linear-gradient(180deg, #d5edf8a0 0 7px, transparent 7px 13px); }
.home-mode-preview__road i:first-child { left: 33%; }
.home-mode-preview__road i:last-child { right: 33%; }
.home-mode-preview__hero { position: absolute; left: 49%; bottom: 5px; width: 13px; height: 19px; border-radius: 4px 4px 2px 2px; background: var(--mode-accent); box-shadow: 0 0 11px var(--mode-accent); }
.home-mode-preview__marker { position: absolute; top: 5px; width: 9px; height: 14px; background: #85bbd3; border-radius: 3px; }
.marker-1 { left: 36%; } .marker-2 { left: 61%; top: 16px; } .marker-3 { left: 46%; top: 1px; }
[data-scene="open"] .home-mode-preview__marker, [data-scene="timer"] .home-mode-preview__marker,
[data-scene="tricks"] .home-mode-preview__marker { display: none; }
[data-scene="obstacles"] .home-mode-preview__marker { background: repeating-linear-gradient(45deg, #ff8585 0 4px, #513039 4px 8px); width: 17px; height: 7px; border: 1px solid #ffb49f; }
[data-scene="gates"] .home-mode-preview__marker { background: transparent; border: 2px solid var(--mode-accent); border-radius: 50%; }
[data-scene="builder"] .home-mode-preview__marker { background: transparent; border: 2px dashed var(--mode-accent); }
[data-scene="loop"] .home-mode-preview__road { border-radius: 50% / 20%; }
[data-scene="timer"] .home-mode-preview__road { border-color: var(--mode-accent); }
.home-mode-preview p { margin: 8px 0 4px; color: #e0f1ff; font-size: 11px; line-height: 1.3; }
#home-mode-preview-rules { display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: #a9d5e3; font-size: 10px; line-height: 1.35; }
@media (max-width: 760px), (max-height: 500px) {
  .home-mode-preview { top: calc(93px + var(--safe-top, 0px)); right: max(9px, var(--safe-right, 0px)); width: min(174px, 44vw); padding: 7px; }
  .home-mode-preview__heading svg { width: 21px; height: 21px; }
  .home-mode-preview__heading strong { font-size: 13px; }
  .home-mode-preview__stage { height: 30px; margin-top: 5px; }
  .home-mode-preview__hero { height: 13px; width: 9px; }
  .home-mode-preview p { margin: 5px 0 2px; font-size: 10px; }
  #home-mode-preview-rules { -webkit-line-clamp: 1; font-size: 9px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  .home-mode-preview { top: calc(66px + var(--safe-top, 0px)); }
}
@media (prefers-reduced-motion: reduce) {
  .home-mode-preview, .home-mode-preview * { animation: none; transition: none; }
}
</style>
