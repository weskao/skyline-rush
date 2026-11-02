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
</script>
<template>
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
</template>
<style scoped>
.hud-mode-selector { border: 0; border-top: 1px solid rgb(190 215 230 / .25); margin: 12px 0; padding: 12px 0 0; min-width: 0; }
.hud-mode-selector legend { font-size: 12px; font-weight: 700; padding: 0 4px; }
/* .vfx-settings label spreads text from its control; HUD choices read control-first. */
.hud-choice { display: flex; justify-content: flex-start; align-items: center; gap: 9px; min-height: 44px; font-size: 12px; cursor: pointer; }
.hud-choice input { accent-color: #8fe5ff; min-width: 19px; min-height: 19px; flex-shrink: 0; }
.hud-default { min-height: 44px; }
.hud-widget-options { border-left: 1px solid rgb(190 215 230 / .3); margin: 6px 0 6px 6px; padding-left: 12px; }
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
