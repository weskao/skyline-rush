<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { activateHudMode, readHudMode, readHudWidgets, writeHudWidgets, readHudFeedback, writeHudFeedback, resetHudPreferences, type HudDisplayMode, type HudWidgets, type HudFeedback } from './control-settings.ts';
import { getLocale, onLocaleChange, t } from './i18n.ts';
const hudMode = ref<HudDisplayMode>(readHudMode());
const widgets = ref<HudWidgets>(readHudWidgets());
const feedback = ref<HudFeedback>(readHudFeedback());
function setHudFeedback(key: keyof HudFeedback, enabled: boolean): void {
  feedback.value = { ...feedback.value, [key]: enabled };
  writeHudFeedback(feedback.value);
}
function resetHudDefaults(): void {
  const defaults = resetHudPreferences();
  hudMode.value = defaults.mode;
  widgets.value = defaults.widgets;
  feedback.value = defaults.feedback;
  document.body.dataset.hudMode = defaults.mode;
  applyWidgetVisibility();
}
function applyWidgetVisibility(): void {
  document.body.dataset.hudLeaderboardVisible = String(widgets.value.leaderboard);
  document.body.dataset.hudMapVisible = String(widgets.value.map);
  document.body.dataset.hudTelemetryVisible = String(widgets.value.telemetry);
}
function setWidget(key: keyof HudWidgets, enabled: boolean): void {
  widgets.value = { ...widgets.value, [key]: enabled };
  applyWidgetVisibility();
  writeHudWidgets(widgets.value);
}
const locale = ref(getLocale());
onUnmounted(onLocaleChange(value => { locale.value = value; }));
// Reading locale.value makes each label re-render on a language switch.
const tr = (key: string): string => t(key, undefined, locale.value);
onMounted(() => { document.body.dataset.hudMode = hudMode.value; applyWidgetVisibility(); });
function chooseHudMode(mode: HudDisplayMode): void {
  hudMode.value = activateHudMode(mode, document.body);
}

import { icons, ICON_ATTRS } from './icons.ts';
const settingsArt = `${import.meta.env.BASE_URL}feature-assets/mobile-controls-hud/raster/ui-settings@3x.webp`;
import HudSourceArtwork from './HudSourceArtwork.vue';
import { panelsView } from './control-panels-view-state.ts';
import { audioView } from './audio-view-state.ts';
const AUDIO_CHANNELS = [{ kind: 'music', label: 'Music' }, { kind: 'sfx', label: 'Sound effects' }] as const;
</script>
<template>
      <div class="settings">
        <button class="icon-button" id="settings-button" :aria-label="tr('hudSettings.panel')" :aria-expanded="panelsView.settingsOpen" aria-controls="settings-panel" :title="tr('hudSettings.panel')"><img class="settings-art-decor" :src="settingsArt" width="72" height="72" alt="" aria-hidden="true" decoding="async" /><svg v-bind="ICON_ATTRS" v-html="icons[audioView.settingsIcon]"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" :aria-label="tr('hudSettings.panel')" :hidden="!panelsView.settingsOpen">
          <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span>{{ audioView.muteAllText }}</span><kbd aria-hidden="true">M</kbd></button></div>
          <div class="audio-channel" v-for="{ kind, label } in AUDIO_CHANNELS" :key="kind">
            <button class="setting" role="switch" :data-audio="kind" :aria-checked="audioView[kind].enabled"><svg v-bind="ICON_ATTRS" v-html="icons[audioView[kind].enabled ? 'sound' : 'mute']"></svg><span :data-i18n="'audio.' + kind">{{ label }}</span><b aria-hidden="true">{{ audioView[kind].displayText }}</b></button>
            <input type="range" min="0" max="100" step="5" :value="audioView[kind].level" :aria-valuetext="audioView[kind].valueText" :style="{ '--fill': audioView[kind].level + '%' }" :aria-label="label + ' volume'" :data-i18n-aria-label="'audio.' + kind + 'Volume'">
          </div>
          <fieldset class="hud-mode-selector">
            <legend>{{ tr('hudSettings.legend') }}</legend>
            <label class="hud-choice"><input type="radio" name="hud-mode" value="hybrid" :checked="hudMode === 'hybrid'" @change="chooseHudMode('hybrid')"><span>{{ tr('hudSettings.hybrid') }}</span></label>
            <label class="hud-choice"><input type="radio" name="hud-mode" value="competitive" :checked="hudMode === 'competitive'" @change="chooseHudMode('competitive')"><span>{{ tr('hudSettings.competitive') }}</span></label>
            <div v-if="hudMode === 'competitive'" class="hud-widget-options">
              <label class="hud-choice"><input type="checkbox" :checked="widgets.leaderboard" @change="setWidget('leaderboard', !widgets.leaderboard)"><span>{{ tr('hudSettings.leaderboard') }}</span></label>
              <label class="hud-choice"><input type="checkbox" :checked="widgets.map" @change="setWidget('map', !widgets.map)"><span>{{ tr('hudSettings.map') }}</span></label>
              <label class="hud-choice"><input type="checkbox" :checked="widgets.telemetry" @change="setWidget('telemetry', !widgets.telemetry)"><span>{{ tr('hudSettings.telemetry') }}</span></label>
            </div>
            <label class="hud-choice"><input type="checkbox" :checked="feedback.sound" @change="setHudFeedback('sound', !feedback.sound)"><span>{{ tr('hudSettings.readySound') }}</span></label>
            <label class="hud-choice"><input type="checkbox" :checked="feedback.animation" @change="setHudFeedback('animation', !feedback.animation)"><span>{{ tr('hudSettings.readyAnimation') }}</span></label>
            <button type="button" class="hud-default" @click="resetHudDefaults()">{{ tr('hudSettings.reset') }}</button>
          </fieldset>
          <HudSourceArtwork />
        </div>
      </div>
</template>
<style scoped>
.settings .icon-button { position: relative; isolation: isolate; }
.settings-art-decor { position: absolute; pointer-events: none; width: 72px; height: 72px;
  top: 50%; left: 50%; max-width: calc(100% - 4px); max-height: calc(100% - 4px); transform: translate(-50%, -50%); opacity: .24; z-index: 0; }
.settings .icon-button > svg { position: relative; z-index: 1; }
.hud-mode-selector { border: 0; border-top: 1px solid rgb(190 215 230 / .25); margin: 12px 0 0; padding: 12px 0 0; }
.hud-mode-selector legend { font-size: 12px; font-weight: 700; padding: 0 4px; }
.hud-choice { display: flex; align-items: center; gap: 9px; min-height: 44px; font-size: 12px; cursor: pointer; }
.hud-choice input { accent-color: #8fe5ff; min-width: 19px; min-height: 19px; }
.hud-default { min-height: 44px; font-size: 11px; text-decoration: underline; }
.hud-widget-options { border-left: 1px solid rgb(190 215 230 / .3); margin: 6px 0 6px 6px; padding-left: 12px; }
/* This scoped id rule outranks .settings-panel, so it carries the viewport cap too. */
#settings-panel { max-height: min(calc(70dvh - 2px), 620px, calc(100dvh - 82px - env(safe-area-inset-bottom, 0px))); overflow-y: auto; }
</style>
<style>
/* Essential position, progress, speed and NITRO remain visible in both modes. */
@media (max-width: 760px) {
  body[data-hud-mode="hybrid"] #leaderboard { display: none; }
}
body[data-hud-leaderboard-visible="false"] #leaderboard { display: none; }
body[data-hud-map-visible="false"] #race-route-map { display: none; }
body[data-hud-telemetry-visible="false"] #style-score { display: none; }
/* On short landscape screens, rankings yield to the car, road and touch controls. */
@media (max-height: 390px) and (orientation: landscape) {
  body[data-hud-mode="competitive"] #leaderboard { display: none; }
}
</style>
