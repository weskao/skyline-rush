<script setup lang="ts">
import MobileGuide from './MobileGuide.vue';
import { guideView } from './guide-view-state.js';
</script>

<template>
  <dialog id="guide-screen" class="history-screen guide-screen" aria-labelledby="guide-title" aria-describedby="guide-intro">
    <header class="guide-header">
      <h2 id="guide-title" data-i18n="guide.title">Start your engines!</h2>
      <button id="guide-close" class="controls-reset" autofocus data-i18n="guide.close">Got it</button>
    </header>
    <p id="guide-intro" data-i18n="guide.intro">A quick control guide. Open it anytime from Practice on the home screen or Controls → How to play.</p>
    <button id="guide-practice" class="controls-reset tutorial-start" :data-i18n="guideView.practiceKey">{{ guideView.practiceText }}</button>
    <div class="guide-devices" role="group" aria-label="Control guide" data-i18n-aria-label="guide.devices">
      <button class="controls-reset" data-guide-device="desktop" :aria-pressed="String(guideView.selectedDevice === 'desktop')" aria-controls="guide-desktop-panel" data-i18n="guide.desktop">Keyboard</button>
      <button class="controls-reset" data-guide-device="mobile" :aria-pressed="String(guideView.selectedDevice === 'mobile')" aria-controls="guide-mobile-panel" data-i18n="guide.mobile">Touch</button>
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
    <p class="guide-note" data-i18n="guide.note">Illustrations only — close this guide to try the controls in a race.</p>
  </dialog>
</template>
