<script setup lang="ts">
import CloseButton from './CloseButton.vue';
import { ICON_ATTRS, icons } from './icons.ts';
import MobileGuide from './MobileGuide.vue';
import CollectiblesGuide from './CollectiblesGuide.vue';
import { guideView } from './guide-view-state.ts';

const quickControls = [
  { name: 'steer', art: ['left', 'right'], keys: 'left right' },
  { name: 'brake', art: ['brake'], keys: 'brake' },
  { name: 'throttle', art: ['pedal'], keys: 'throttle' },
  { name: 'fly', art: ['fly'], keys: 'fly' },
] as const;
function touchTip(action: typeof quickControls[number]['name']): string {
  const mode = guideView.steerMode;
  const control = action === 'steer' ? mode : action === 'brake' && mode !== 'buttons' ? 'padBrake' : action;
  return `guide.quick.touch.${control}`;
}
</script>

<template>
  <dialog id="guide-screen" class="history-screen guide-screen" aria-labelledby="guide-title" aria-describedby="guide-intro">
    <header class="guide-header">
      <h2 id="guide-title" data-i18n="guide.title">Start your engines!</h2>
      <CloseButton :hidden="!guideView.firstStart" id="guide-cancel" label="Close driving guide" data-i18n-aria-label="guide.closeAria" autofocus />
      <button :hidden="guideView.firstStart" id="guide-close" class="controls-reset" autofocus data-i18n="guide.close">Got it</button>
    </header>
    <ul id="guide-quick" aria-label="Quick driving controls" data-i18n-aria-label="guide.quick.label" class="guide-quick" :hidden="guideView.selectedDevice === 'items'">
      <li v-for="control in quickControls" :key="control.name">
        <span class="guide-quick-art" aria-hidden="true"><svg v-for="art in control.art" :key="art" v-bind="ICON_ATTRS" v-html="icons[art]"></svg></span>
        <strong :data-i18n="`guide.quick.${control.name}`"></strong>
        <span v-show="guideView.selectedDevice === 'desktop'" :data-guide-quick-keys="control.keys"></span>
        <span v-show="guideView.selectedDevice === 'mobile'" :data-i18n="touchTip(control.name)"></span>
      </li>
    </ul>
    <div class="guide-start-actions">
      <button id="guide-practice" class="controls-reset tutorial-start" :data-i18n="guideView.practiceKey">{{ guideView.practiceText }}</button>
      <button id="guide-start-race" class="controls-reset" :hidden="!guideView.firstStart" data-i18n="tutorial.raceDirect">Race now</button>
    </div>
    <p id="guide-intro" data-i18n="guide.intro">A quick control guide. Open it anytime from Practice on the home screen or Controls → How to play.</p>
    <div class="guide-devices" role="group" aria-label="Control guide" data-i18n-aria-label="guide.devices">
      <button class="controls-reset" data-guide-device="desktop" :aria-pressed="guideView.selectedDevice === 'desktop'" aria-controls="guide-desktop-panel" data-i18n="guide.desktop">Keyboard</button>
      <button class="controls-reset" data-guide-device="mobile" :aria-pressed="guideView.selectedDevice === 'mobile'" aria-controls="guide-mobile-panel" data-i18n="guide.mobile">Touch</button>
      <button class="controls-reset" data-guide-device="items" :aria-pressed="guideView.selectedDevice === 'items'" aria-controls="guide-items-panel" data-i18n="guide.items">Rings &amp; Supplies</button>
    </div>
    <section id="guide-desktop-panel" :hidden="guideView.selectedDevice !== 'desktop'" aria-label="Keyboard controls" data-i18n-aria-label="guide.desktop">
      <p data-i18n="guide.keyboardHint">Your current keys are shown below. Change them in Controls.</p>
      <dl class="guide-keys">
        <div v-for="action in ['throttle', 'brake', 'left', 'right', 'fly', 'boost', 'nitro']">
          <dt><strong :data-i18n="`keymap.${action}`">{{ action }}</strong><span :data-keys="action"></span></dt>
          <dd :data-i18n="`guide.${action}`"></dd>
        </div>
      </dl>
      <p class="guide-shortcuts"><kbd>Esc / P</kbd> <span data-i18n="guide.pause">Pause / resume</span> · <kbd>C</kbd> <span data-i18n="guide.camera">Camera</span> · <kbd>F2</kbd> <span data-i18n="guide.auto">Auto accelerate</span></p>
    </section>
    <section id="guide-mobile-panel" :hidden="guideView.selectedDevice !== 'mobile'"><MobileGuide /></section>
    <section id="guide-items-panel" :hidden="guideView.selectedDevice !== 'items'"><CollectiblesGuide /></section>
    <p class="guide-note" data-i18n="guide.note">Illustrations only — close this guide to try the controls in a race.</p>
  </dialog>
</template>

<style scoped>
.guide-quick { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 0; margin: 0; list-style: none; }
.guide-quick li { display: grid; grid-template-rows: auto auto 1fr; align-items: start; min-width: 0; gap: 3px; padding: 8px; border: 1px solid #42596c; border-radius: 8px; background: #101e2d; font-size: 12px; }
.guide-quick li > span:not(.guide-quick-art) { color: #b5c9dd; }
.guide-quick-art { display: flex; align-items: center; gap: 4px; color: #96e3ff; }
.guide-quick-art svg { width: 20px; height: 20px; }
.guide-quick [data-guide-quick-keys] { display: flex; flex-wrap: wrap; align-items: center; }
.guide-start-actions { display: flex; gap: 8px; margin-top: 12px; }
.guide-start-actions > button { flex: 1; margin: 0; }
.guide-start-actions .tutorial-start { width: auto; margin: 0; }
.guide-start-actions #guide-start-race { padding-inline: 12px; font-weight: 700; }
.guide-header .close-button { min-width: 44px; }
@media (max-width: 550px) {
  .guide-quick { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (orientation: landscape) and (max-height: 450px) {
  .guide-start-actions { margin-top: 8px; }
  .guide-start-actions :is(.tutorial-start, #guide-start-race) { min-height: 44px; }
  .guide-header { padding-block: 4px; }
}
</style>
