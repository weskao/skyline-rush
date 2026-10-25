<script setup lang="ts">
import { MOBILE_GUIDE_COPY } from './mobile-guide-copy.js';

type Topic = 'slide' | 'buttons' | 'auto' | 'fly' | 'boost' | 'nitro' | 'settings';
const topics: Topic[] = ['slide', 'buttons', 'auto', 'fly', 'boost', 'nitro', 'settings'];
const symbols = { auto: 'A', fly: '↑', boost: '»', nitro: 'ϟ', settings: 'Ⅱ' };
</script>

<template>
  <div id="guide-mobile" class="mobile-guide">
    <p class="mobile-guide-intro" data-i18n="guide.mobile.intro">{{ MOBILE_GUIDE_COPY.en['guide.mobile.intro'] }}</p>
    <div class="mobile-guide-grid">
      <section v-for="topic in topics" :key="topic" class="mobile-guide-card">
        <div class="mobile-guide-diagram" aria-hidden="true">
          <svg v-if="topic === 'slide'" viewBox="0 0 160 64" fill="none" focusable="false">
            <rect x="2" y="2" width="156" height="60" rx="15" class="mobile-guide-pad" />
            <path d="M24 24h112M34 14 24 24l10 10m92-20 10 10-10 10M80 16v34m-10-10 10 10 10-10" />
            <circle cx="80" cy="24" r="7" class="mobile-guide-finger" />
          </svg>
          <div v-else-if="topic === 'buttons'" class="mobile-guide-keys"><span>←</span><span>↓</span><span>→</span></div>
          <span v-else class="mobile-guide-key">{{ symbols[topic] }}</span>
        </div>
        <div class="mobile-guide-copy">
          <h3 :data-i18n="`guide.mobile.${topic}.title`">{{ MOBILE_GUIDE_COPY.en[`guide.mobile.${topic}.title`] }}</h3>
          <p :data-i18n="`guide.mobile.${topic}.body`">{{ MOBILE_GUIDE_COPY.en[`guide.mobile.${topic}.body`] }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.mobile-guide { width: 100%; min-width: 0; color: #edf5ff; text-align: left; }
.mobile-guide-intro { margin: 0 0 16px; color: #b5c9dd; font-size: 14px; line-height: 1.6; }
.mobile-guide-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); gap: 12px; }
.mobile-guide-card { min-width: 0; padding: 16px; border: 1px solid #32485e; border-radius: 14px; background: #101e2d; }
.mobile-guide-diagram { display: flex; align-items: center; min-height: 64px; margin-bottom: 12px; color: #8ee8ef; }
.mobile-guide-diagram svg { display: block; width: 160px; max-width: 100%; height: 64px; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.mobile-guide-pad { fill: #172d40; stroke: #53768e; }
.mobile-guide-finger { fill: #8ee8ef; stroke: #101e2d; }
.mobile-guide-keys { display: flex; gap: 8px; }
.mobile-guide-key, .mobile-guide-keys span { display: grid; place-items: center; box-sizing: border-box; min-width: 44px; min-height: 44px; border: 1px solid #53768e; border-radius: 10px; background: #172d40; font-size: 24px; font-weight: 700; line-height: 1; }
.mobile-guide-copy h3 { margin: 0 0 8px; font-size: 16px; line-height: 1.4; color: #edf5ff; letter-spacing: normal; overflow-wrap: anywhere; }
.mobile-guide-copy p { margin: 0; font-size: 14px; line-height: 1.65; color: #c4d3e2; overflow-wrap: anywhere; }
@media (max-width: 360px) { .mobile-guide-card { padding: 12px; } }
@media (max-height: 450px) and (orientation: landscape) {
  .mobile-guide-card { padding: 12px; }
  .mobile-guide-diagram { min-height: 44px; margin-bottom: 8px; }
}
</style>
