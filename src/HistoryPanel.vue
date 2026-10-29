<script setup lang="ts">
import { RACE_TRACKS } from './game.js';
import { icons, ICON_ATTRS } from './icons.ts';
import SignInButton from './SignInButton.vue';
import { historyView } from './history-view-state.ts';
import { cloudView, updateCloudView } from './cloud-view-state.ts';
function hideBrokenCloudAvatar() { updateCloudView({ avatarFailed: true }); }

const GOOGLE_ICON = `${import.meta.env.BASE_URL}icons/google-sign-in.webp`;
const MEDALS = [['first-win', 'First victory', 'Win your first race'], ['clean-run', 'Clean run', 'Finish without a collision'], ['perfect-five', 'Perfect flight', 'Five PERFECT LINEs in one race'], ['nitro-chain', 'Triple burst', 'Chain three NITRO charges']];
</script>

<template>
  <dialog id="history-screen" class="history-screen" aria-labelledby="history-title">
    <header class="history-heading"><h2 id="history-title" data-i18n="history.title">Race history</h2><button class="controls-button" id="history-close" aria-label="Close history" data-i18n-aria-label="history.close" data-i18n="common.close">Close</button></header>
    <p id="career-summary" class="career-summary">{{ historyView.careerSummary }}</p>
    <section class="history-extra" aria-labelledby="cloud-title">
      <h3 id="cloud-title" data-i18n="cloud.title">Cloud save</h3>
      <p data-i18n="cloud.explain">Sign in to save race progress and restore it after clearing browser data. Existing progress on this device will be merged. Device settings and ghosts stay here.</p>
      <SignInButton id="cloud-login" :icon="GOOGLE_ICON" label-key="cloud.login" :hidden="cloudView.loginHidden" :disabled="cloudView.loginDisabled">Sign in with Google</SignInButton>
      <button type="button" class="controls-reset" id="cloud-logout" data-i18n="cloud.logout" :hidden="cloudView.logoutHidden">Sign out</button>
      <p id="cloud-logout-note" class="cloud-logout-note" data-i18n="cloud.logoutNote" :hidden="cloudView.logoutNoteHidden">Signing out does not delete cloud results or your Google account.</p>
      <button type="button" class="controls-reset" id="cloud-switch" data-i18n="cloud.switch" :hidden="cloudView.switchHidden">Use this account</button>
      <button type="button" class="controls-reset" id="cloud-sync-now" data-i18n="cloud.syncNow" :disabled="cloudView.syncDisabled">Sync now</button>
      <button type="button" class="controls-reset" id="cloud-export" data-i18n="cloud.export">Export race progress</button>
      <button type="button" class="controls-reset" id="cloud-import" data-i18n="cloud.import">Import race progress</button>
      <input id="cloud-import-file" type="file" accept=".json,application/json" hidden />
      <button type="button" class="controls-reset" id="cloud-delete" data-i18n="cloud.delete" :hidden="cloudView.deleteHidden" :disabled="cloudView.deleteDisabled">Delete race progress</button>
      <div class="cloud-player" aria-live="polite">
        <img id="cloud-avatar" class="cloud-avatar" alt="" referrerpolicy="no-referrer" :src="cloudView.avatarUrl || undefined" :hidden="!cloudView.avatarUrl || cloudView.avatarFailed" @error="hideBrokenCloudAvatar" />
        <span id="cloud-avatar-fallback" class="cloud-avatar-fallback" aria-hidden="true" :hidden="!!cloudView.avatarUrl && !cloudView.avatarFailed">G</span>
        <div class="cloud-player-details">
          <strong id="cloud-name">{{ cloudView.name }}</strong>
          <p id="cloud-identity">{{ cloudView.identity }}</p>
        </div>
      </div>
      <p id="cloud-status" role="status" :data-cloud-state="cloudView.statusState" :aria-busy="cloudView.statusBusy">{{ cloudView.statusText }}</p>
      <p id="cloud-last-sync">{{ cloudView.lastSyncText }}</p>
    </section>
    <label class="history-filter"><span data-i18n="history.track">Track</span> <select id="history-track" aria-label="History track" data-i18n-aria-label="history.trackAria"><option v-for="(track, id) in RACE_TRACKS" :value="id">{{ track.name }}</option></select></label>
    <figure class="history-trend" :hidden="!historyView.trendVisible"><figcaption id="history-trend-label">{{ historyView.trendLabel }}</figcaption><svg id="history-chart" viewBox="0 0 500 80" role="img" aria-labelledby="history-trend-label"><polyline :points="historyView.trendPolyPoints"/><circle v-for="(point, i) in historyView.trendCircles" :key="i" :cx="point.x" :cy="point.y" r="3"><title>{{ point.title }}</title></circle></svg></figure>
    <p id="history-empty" data-i18n="history.empty" :hidden="!historyView.historyEmpty">No runs here yet. Finish a race to start your history.</p>
    <div id="history-runs" class="history-runs"><details v-for="(run, i) in historyView.historyRuns" :key="i" class="history-run"><summary><span v-for="(field, j) in run.fields" :key="j">{{ field }}</span><b v-if="run.best" class="history-best">{{ run.bestLabel }}</b></summary><p>{{ run.detail }}</p></details></div>
    <section class="history-extra" id="mode-history" aria-labelledby="mode-history-title">
      <h3 id="mode-history-title" data-i18n="mode.historyTitle">Challenge records</h3>
      <p class="mode-history-disclaimer" id="mode-history-notice" data-i18n="mode.historyNotice">Personal challenge results do not award Career stars or official medals.</p>
      <label class="history-filter mode-history-filter"><span data-i18n="mode.historyFilter">Mode</span>
        <select id="mode-history-filter" aria-label="Challenge history mode" data-i18n-aria-label="mode.historyFilterAria">
          <option value="all" data-i18n="mode.historyAll">All modes</option>
          <option value="custom" data-i18n="mode.custom">Custom Race</option>
          <option value="eventlab" data-i18n="mode.eventlab">Event Lab</option>
          <option value="time" data-i18n="mode.time">Time Attack</option>
          <option value="gauntlet" data-i18n="mode.gauntlet">Obstacle Run</option>
          <option value="checkpoint" data-i18n="mode.checkpoint">Checkpoint Rush</option>
          <option value="cup" data-i18n="mode.cup">Championship Cup</option>
          <option value="stunt" data-i18n="mode.stunt">Stunt Attack</option>
          <option value="elimination" data-i18n="mode.elimination">Elimination</option>
        </select>
      </label>
      <p id="mode-history-empty" data-i18n="mode.historyEmpty" :hidden="!historyView.modeHistoryEmpty">Complete a Custom Race or Time Attack to save a personal record.</p>
      <div id="mode-history-runs" class="mode-history-runs"><p v-for="(run, i) in historyView.modeRuns" :key="i" :data-mode="run.mode" :data-personal-best="String(run.personalBest)" :data-ghost="String(run.ghost)">{{ run.text }}</p></div>
    </section>
    <section id="daily-challenge" class="history-extra" aria-labelledby="daily-title">
      <h3 id="daily-title" data-i18n="daily.title">Daily challenge</h3>
      <p id="daily-status">{{ historyView.dailyStatus }}</p>
      <button id="daily-start" class="controls-reset" data-i18n="daily.start" :disabled="historyView.dailyStartDisabled">Start daily challenge</button>
      <h4 data-i18n="daily.board">Daily board</h4><div id="daily-board"><p v-for="(line, i) in historyView.dailyBoard" :key="i">{{ line }}</p></div>
    </section>
    <section class="history-extra" aria-labelledby="achievements-title">
      <h3 id="achievements-title" data-i18n="medal.title">Medals</h3><p id="achievement-status">{{ historyView.achievementStatus }}</p>
      <ul id="achievement-list" class="achievement-list"><li v-for="[id, name, detail] in MEDALS" :data-medal="id" :class="{ 'is-awarded': Boolean(historyView.medalAwards[id]) }"><svg v-bind="ICON_ATTRS" v-html="icons.star"></svg><div><strong :data-i18n="`medal.${id}`">{{ name }}</strong><span :data-i18n="`medal.${id}.detail`">{{ detail }}</span></div><small>{{ historyView.medalAwards[id] ?? historyView.medalNotAwarded }}</small></li></ul>
    </section>
  </dialog>
</template>
