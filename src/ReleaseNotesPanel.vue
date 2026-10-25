<script setup lang="ts">
import { releaseView } from './release-view-state.ts';
</script>
<template>
  <dialog id="whats-new-screen" class="history-screen release-screen" aria-labelledby="release-title" aria-describedby="release-intro">
    <header class="release-header">
      <div>
        <small data-i18n="release.eyebrow">SKYLINE RUSH / RELEASE NOTES</small>
        <h2 id="release-title" data-i18n="release.title">What's new</h2>
        <p id="release-intro" class="release-intro" data-i18n="release.intro">See what's new for your next race.</p>
      </div>
      <button id="release-close" type="button" class="release-close" aria-label="Close what's new" data-i18n-aria-label="release.close">×</button>
    </header>
    <div id="release-versions" class="release-versions" role="tablist" aria-label="Versions" data-i18n-aria-label="release.versions">
      <button v-for="tab in releaseView.tabs" :key="tab.version" type="button" :id="tab.id" class="release-tab" :tabindex="tab.selected ? 0 : -1" :data-version="tab.version" role="tab" aria-controls="release-panel" :aria-selected="String(tab.selected)">
        <span class="release-tab-version">v{{ tab.version }}</span>
        <span :class="tab.latest ? 'release-tab-note release-tab-latest' : 'release-tab-note'">{{ tab.note }}</span>
        <span v-if="tab.unread" class="release-tab-unread">{{ tab.unreadLabel }}</span>
      </button>
    </div>
    <section id="release-panel" class="release-panel" role="tabpanel" tabindex="0" :aria-labelledby="releaseView.panelLabel">
      <img id="release-hero" class="release-hero" alt="" :src="releaseView.heroSrc || undefined" :hidden="!releaseView.heroSrc" @error="releaseView.heroSrc = ''">
      <div class="release-meta"><span id="release-version">{{ releaseView.version }}</span><span id="release-date">{{ releaseView.date }}</span></div>
      <div id="release-items" class="release-entries">
        <article v-for="(entry, index) in releaseView.entries" :key="index" class="release-entry" :data-kind="entry.kind">
          <img v-if="entry.image" :src="entry.image" alt="" loading="lazy" @error="event => event.target.remove()">
          <div><span class="release-kind">{{ entry.kindLabel }}</span><strong>{{ entry.title }}</strong><p>{{ entry.description }}</p></div>
        </article>
      </div>
    </section>
    <footer class="release-footer">
      <button type="button" class="primary-button" id="release-continue" data-i18n="release.continue">Continue</button>
    </footer>
  </dialog>
</template>
