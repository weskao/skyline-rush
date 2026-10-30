<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { activateHudMode, readHudMode, type HudDisplayMode } from './control-settings.ts';
import { getLocale, onLocaleChange } from './i18n.ts';
const hudMode = ref<HudDisplayMode>(readHudMode());
const isChinese = ref(getLocale() === 'zh-TW');
onUnmounted(onLocaleChange(locale => { isChinese.value = locale === 'zh-TW'; }));
onMounted(() => { document.body.dataset.hudMode = hudMode.value; });
function chooseHudMode(mode: HudDisplayMode): void {
  hudMode.value = activateHudMode(mode, document.body);
}

import { icons, ICON_ATTRS } from './icons.ts';
import { panelsView } from './control-panels-view-state.ts';
import { audioView } from './audio-view-state.ts';
const AUDIO_CHANNELS = [{ kind: 'music', label: 'Music' }, { kind: 'sfx', label: 'Sound effects' }] as const;
</script>
<template>
      <div class="settings">
        <button class="icon-button" id="settings-button" :aria-label="isChinese ? '音訊與遊戲介面設定' : 'Audio and HUD settings'" :aria-expanded="panelsView.settingsOpen" aria-controls="settings-panel" :title="isChinese ? '音訊與遊戲介面設定' : 'Audio and HUD settings'"><svg v-bind="ICON_ATTRS" v-html="icons[audioView.settingsIcon]"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" :aria-label="isChinese ? '音訊與遊戲介面設定' : 'Audio and HUD settings'" :hidden="!panelsView.settingsOpen">
          <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span>{{ audioView.muteAllText }}</span><kbd aria-hidden="true">M</kbd></button></div>
          <div class="audio-channel" v-for="{ kind, label } in AUDIO_CHANNELS" :key="kind">
            <button class="setting" role="switch" :data-audio="kind" :aria-checked="audioView[kind].enabled"><svg v-bind="ICON_ATTRS" v-html="icons[audioView[kind].enabled ? 'sound' : 'mute']"></svg><span :data-i18n="'audio.' + kind">{{ label }}</span><b aria-hidden="true">{{ audioView[kind].displayText }}</b></button>
            <input type="range" min="0" max="100" step="5" :value="audioView[kind].level" :aria-valuetext="audioView[kind].valueText" :style="{ '--fill': audioView[kind].level + '%' }" :aria-label="label + ' volume'" :data-i18n-aria-label="'audio.' + kind + 'Volume'">
          </div>
          <fieldset class="hud-mode-selector">
            <legend>{{ isChinese ? '遊戲介面 · HUD' : 'Race HUD' }}</legend>
            <label class="hud-choice"><input type="radio" name="hud-mode" value="hybrid" :checked="hudMode === 'hybrid'" @change="chooseHudMode('hybrid')"><span>{{ isChinese ? '沉浸式 (Hybrid A+B)' : 'Immersive (Hybrid A+B)' }}</span></label>
            <label class="hud-choice"><input type="radio" name="hud-mode" value="competitive" :checked="hudMode === 'competitive'" @change="chooseHudMode('competitive')"><span>{{ isChinese ? '競技資訊 (C)' : 'Competitive (C)' }}</span></label>
            <button type="button" class="hud-default" @click="chooseHudMode('hybrid')">{{ isChinese ? '重設為預設介面' : 'Reset HUD to default' }}</button>
          </fieldset>
        </div>
      </div>
</template>
<style scoped>
.hud-mode-selector { border: 0; border-top: 1px solid rgb(190 215 230 / .25); margin: 12px 0 0; padding: 12px 0 0; }
.hud-mode-selector legend { font-size: 12px; font-weight: 700; padding: 0 4px; }
.hud-choice { display: flex; align-items: center; gap: 9px; min-height: 44px; font-size: 12px; cursor: pointer; }
.hud-choice input { accent-color: #8fe5ff; min-width: 19px; min-height: 19px; }
.hud-default { min-height: 44px; font-size: 11px; text-decoration: underline; }
#settings-panel { max-height: min(70dvh, 620px); overflow-y: auto; }
</style>
<style>
/* Essential position, progress, speed and NITRO remain visible in both modes. */
@media (max-width: 760px) {
  body[data-hud-mode="hybrid"] #leaderboard { display: none; }
}
/* On short landscape screens, rankings yield to the car, road and touch controls. */
@media (max-height: 390px) and (orientation: landscape) {
  body[data-hud-mode="competitive"] #leaderboard { display: none; }
}
</style>
