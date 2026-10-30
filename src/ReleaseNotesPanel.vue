<script setup lang="ts">
import { ref } from 'vue';
import { releaseView } from './release-view-state.ts';
import ReleaseMediaViewer from './ReleaseMediaViewer.vue';
const viewer = ref<InstanceType<typeof ReleaseMediaViewer> | null>(null);
function hideBrokenThumbnail(index: number) {
  const entry = releaseView.entries[index];
  if (entry) entry.image = '';
}
const zoomImage = (src: string, label: string, event: Event) => viewer.value?.open({ kind: 'image', src, label }, event.currentTarget as HTMLElement);
function zoomClip() {
  const clip = releaseView.heroVideo, from = document.getElementById('release-video-zoom');
  if (clip && from) viewer.value?.open({ kind: 'video', src: clip.src || clip.source, poster: clip.poster, source: clip.source, label: releaseView.zoom.video }, from);
}
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
      <button v-for="tab in releaseView.tabs" :key="tab.version" type="button" :id="tab.id" class="release-tab" :tabindex="tab.selected ? 0 : -1" :data-version="tab.version" role="tab" aria-controls="release-panel" :aria-selected="tab.selected">
        <span class="release-tab-version">{{ tab.label }}</span>
        <span :class="tab.latest ? 'release-tab-note release-tab-latest' : 'release-tab-note'">{{ tab.note }}</span>
        <span v-if="tab.unread" class="release-tab-unread">{{ tab.unreadLabel }}</span>
      </button>
    </div>
    <section id="release-panel" class="release-panel" role="tabpanel" tabindex="0" :aria-labelledby="releaseView.panelLabel">
      <div v-if="releaseView.heroVideo" class="release-hero-frame">
      <video :key="releaseView.heroVideo.source" id="release-video" class="release-hero release-video"
        :data-variant="releaseView.heroVideo.variant" :data-source="releaseView.heroVideo.source" :src="releaseView.heroVideo.src || undefined" :poster="releaseView.heroVideo.poster"
        muted loop playsinline preload="none" disablepictureinpicture :controls="releaseView.heroVideo.controls"
        :aria-hidden="releaseView.heroVideo.controls ? undefined : 'true'" @error="releaseView.heroVideo = null"
        @click="releaseView.heroVideo.controls || zoomClip()"></video>
      <button id="release-video-zoom" type="button" class="release-zoom-corner" :aria-label="releaseView.zoom.video" @click="zoomClip">⤢</button>
      </div>
      <button id="release-hero-zoom" type="button" class="release-zoom" :aria-label="releaseView.zoom.image" :hidden="!releaseView.heroSrc || !!releaseView.heroVideo"
        @click="zoomImage(releaseView.heroSrc, releaseView.zoom.image, $event)">
        <img id="release-hero" class="release-hero" alt="" :src="releaseView.heroSrc || undefined" :hidden="!releaseView.heroSrc || !!releaseView.heroVideo" @error="releaseView.heroSrc = ''">
      </button>
      <div class="release-meta"><span id="release-version">{{ releaseView.version }}</span><span id="release-date">{{ releaseView.date }}</span></div>
      <div id="release-items" class="release-entries">
        <article v-for="(entry, index) in releaseView.entries" :key="index" class="release-entry" :data-kind="entry.kind">
          <button v-if="entry.image" type="button" class="release-zoom" :aria-label="entry.zoomLabel" @click="zoomImage(entry.image, entry.title, $event)">
            <img :src="entry.image" alt="" loading="lazy" @error="hideBrokenThumbnail(index)">
          </button>
          <div><span class="release-kind">{{ entry.kindLabel }}</span><strong>{{ entry.title }}</strong><p>{{ entry.description }}</p></div>
        </article>
      </div>
    </section>
    <footer class="release-footer">
      <button type="button" class="primary-button" id="release-continue" data-i18n="release.continue">Continue</button>
    </footer>
    <ReleaseMediaViewer ref="viewer" :close-label="releaseView.zoom.close" />
  </dialog>
</template>
<style scoped>
.release-zoom { display: block; width: 100%; padding: 0; border: 0; border-radius: 8px; background: none; cursor: zoom-in; }
.release-zoom[hidden] { display: none; }
/* Hugs the centered clip so the enlarge button sits on its corner: 480 px wide landscape, height-sized portrait. */
.release-hero-frame { position: relative; width: min(100%, 480px); margin-inline: auto; }
.release-hero-frame:has(video[data-variant="mobile"]) { width: fit-content; }
.release-hero-frame video:not([controls]) { cursor: zoom-in; }
/* Short landscape screens hide the hero clip to save height (style.css); its enlarge button goes with it. */
@media (max-height: 420px) { .release-hero-frame { display: none; } }
.release-zoom-corner { position: absolute; top: 8px; right: 8px; width: 44px; height: 44px; padding: 0; border: 1px solid rgb(150 227 255 / .35); border-radius: 50%;
  background: rgb(8 16 28 / .78); font-size: 22px; line-height: 1; color: #eefbff; }
</style>
