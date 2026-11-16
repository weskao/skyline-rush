<script setup lang="ts">
// Pause / results overlay markup; race-navigation-ui.ts and cloud-ui.ts drive it by id.
import { icons, ICON_ATTRS } from './icons.ts';
import SignInButton from './SignInButton.vue';
import { cloudView } from './cloud-view-state.ts';
</script>

<template>
<section class="race-overlay" id="race-overlay" aria-labelledby="overlay-title" hidden>
  <div class="overlay-content">
    <div class="overlay-summary">
      <span class="overlay-route">SKYLINE RUSH / COASTAL RUN</span>
      <h2 id="overlay-title">Take a breather.</h2>
      <p id="overlay-copy">The skyline can wait.</p>
      <span id="new-best" class="new-best" data-i18n="result.newBest" hidden>NEW BEST</span>
      <div id="result-stats" class="result-stats" hidden></div>
      <ol id="result-standings" class="result-standings" role="list" tabindex="0" data-i18n-aria-label="mode.cupStandings" hidden></ol>
      <details class="result-style-details" id="result-style-details" hidden>
        <summary data-i18n="result.styleDetails">Driving style</summary>
        <div id="result-style" class="result-style" hidden></div>
      </details>
    </div>
    <div class="overlay-actions">
      <div class="result-rewards" id="result-rewards"></div>
      <button class="primary-button" id="resume-button" aria-label="Resume race" data-i18n-aria-label="resume.aria"><span data-i18n="resume.label">Continue racing</span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      <button class="primary-button next-button" id="next-stage" hidden>Next stage</button>
      <button class="primary-button next-button" id="next-button" hidden><span><span data-i18n="result.next">Next ·</span> <b id="next-track"></b></span><svg v-bind="ICON_ATTRS" v-html="icons.arrow"></svg></button>
      <button class="text-button" id="again-button"><span data-i18n="result.again">Race again</span> <svg v-bind="ICON_ATTRS" v-html="icons.restart"></svg></button>
      <button type="button" class="text-button" id="pause-settings"><svg v-bind="ICON_ATTRS" v-html="icons.settings"></svg><span data-i18n="settings.game">Game settings</span></button>
      <button type="button" class="text-button" id="pause-leave" data-i18n="leave.action" hidden>Leave race</button>
      <button type="button" class="text-button" id="photo-open" hidden><svg v-bind="ICON_ATTRS" v-html="icons.camera"></svg><span data-i18n="photo.open">PHOTO STUDIO</span></button>
      <div class="result-links" id="result-links" hidden><button class="text-button" id="choose-track" data-i18n="track.choose">Choose track</button><button class="text-button" data-open-history data-i18n="nav.progress">Progress</button></div>
      <div class="result-cloud" id="result-cloud" :hidden="cloudView.resultHidden" :data-state="cloudView.resultState"><p id="result-cloud-status" role="status" aria-live="polite" :aria-busy="cloudView.resultBusy">{{ cloudView.resultText }}</p><SignInButton id="result-cloud-login" label-key="cloud.login" :hidden="cloudView.resultSignInHidden" :disabled="cloudView.resultSignInDisabled">Sign in with Google</SignInButton></div>
    </div>
  </div>
</section>
</template>
