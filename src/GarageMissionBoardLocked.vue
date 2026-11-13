<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import { getLocale, onLocaleChange } from './i18n.ts';
import { filterWave3PreviewItems } from './garage-wave3-preview-catalog.ts';
import type { Wave3PreviewItem } from './garage-wave3-preview-catalog.ts';

const locale = ref(getLocale());
// Same ids, names and art as the concept gallery's WAVE3_PREVIEW_CATALOG entry.
const missions = filterWave3PreviewItems('garage-rewards-and-missions', 'mission');
const trophies = filterWave3PreviewItems('garage-rewards-and-missions', 'trophy');
const title = (item: Wave3PreviewItem) => item.name[locale.value];
const asset = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/garage-rewards-and-missions/raster/${id}@3x.png`;
let stopListening: (() => void) | undefined;
onMounted(() => { locale.value = getLocale(); stopListening = onLocaleChange(next => { locale.value = next; }); });
onUnmounted(() => stopListening?.());
</script>

<template>
  <!-- No authoritative mission ledger yet. Never invent progress, completion or a claim. -->
  <section class="garage-mission-board" aria-labelledby="garage-missions-title"
    data-mission-state="unavailable" data-rewards-authority="not-connected">
    <div class="garage-mission-heading">
      <h3 id="garage-missions-title">{{ locale === 'zh-TW' ? '任務中心' : 'Mission center' }}</h3>
      <span class="garage-mission-coming">{{ locale === 'zh-TW' ? '尚未開放' : 'Coming soon' }}</span>
    </div>
    <p class="garage-mission-notice">{{ locale === 'zh-TW'
      ? '目前尚無已驗證的任務進度，不會發放獎勵或獎盃。'
      : 'Verified mission progress is unavailable. No rewards or trophies are granted.' }}</p>
    <div class="garage-mission-grid">
      <article v-for="item in missions" :key="item.id" class="garage-mission-card"
        :data-mission-id="item.id" data-mission-state="unavailable">
        <GarageArtworkImage :src="asset(item.id)" :size="96" :image-id="item.id"
          :alt="title(item)" :fallback-text="title(item)" />
        <div class="garage-mission-meta">
          <h4>{{ title(item) }}</h4>
          <span class="garage-mission-status">{{ locale === 'zh-TW' ? '尚未追蹤' : 'Not tracking' }}</span>
          <div class="garage-mission-progress" aria-hidden="true"></div>
          <small>{{ locale === 'zh-TW' ? '進度 — / —' : 'Progress — / —' }}</small>
        </div>
      </article>
    </div>
    <div class="garage-mission-heading garage-trophy-heading">
      <h4 id="garage-trophies-title">{{ locale === 'zh-TW' ? '獎盃展示' : 'Trophy showcase' }}</h4>
      <span class="garage-mission-coming">{{ locale === 'zh-TW' ? '僅供展示' : 'Preview only' }}</span>
    </div>
    <div class="garage-trophy-grid" role="list" aria-labelledby="garage-trophies-title">
      <figure v-for="item in trophies" :key="item.id" class="garage-trophy-card"
        :data-trophy-id="item.id" data-trophy-state="display-only" role="listitem">
        <GarageArtworkImage :src="asset(item.id)" :size="96" :image-id="item.id"
          :alt="title(item)" :fallback-text="title(item)" />
        <figcaption><strong>{{ title(item) }}</strong>
          <small>{{ locale === 'zh-TW' ? '僅展示' : 'Display only' }}</small></figcaption>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.garage-mission-board { box-sizing:border-box; min-width:0; margin:16px 0; padding:12px; border:1px solid #405c85;
  border-radius:14px; color:#e7f5ff; background:linear-gradient(140deg,#142742,#0a1525); }
.garage-mission-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap; }
.garage-mission-heading h3 { margin:0; font-size:16px; }
.garage-mission-coming { padding:4px 9px; border-radius:30px; font-size:11px; background:#373057; color:#f0d1ff; }
.garage-mission-notice { margin:8px 0 12px; font-size:12px; line-height:1.55; color:#b7cee7; }
.garage-mission-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,215px),1fr)); gap:10px; }
.garage-mission-card { display:flex; gap:9px; align-items:center; min-width:0; padding:10px;
  border:1px solid #385375; border-radius:12px; background:#12223a; }
.garage-mission-card :deep(.artwork-img) { flex:0 0 96px; object-fit:contain; }
.garage-mission-meta { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
.garage-mission-meta h4 { margin:0; font-size:13px; overflow-wrap:anywhere; }
.garage-mission-status, .garage-mission-meta small { color:#abbfd5; font-size:11px; }
 .garage-mission-progress { height:7px; border:1px dashed #60718b; border-radius:8px; background:#213047; }
.garage-trophy-heading { margin-top:16px; }
.garage-trophy-heading h4 { margin:0; font-size:15px; }
/* Same compact 2x2 trophy block as GarageMissionBoard.vue; 3px side padding keeps 96px art whole at 214px. */
.garage-trophy-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-top:8px; }
.garage-trophy-card { min-width:0; margin:0; padding:7px 3px 8px; display:flex; flex-direction:column; align-items:center; gap:4px;
  border:1px solid #536184; border-radius:12px; background:radial-gradient(circle at 50% 30%,#33476b,#121f37 74%); }
.garage-trophy-card :deep(.artwork-img) { object-fit:contain; max-width:100%; }
.garage-trophy-card figcaption { display:grid; gap:1px; min-width:0; line-height:1.25; text-align:center; overflow-wrap:anywhere; }
.garage-trophy-card strong { font-size:12px; }
.garage-trophy-card small { font-size:11px; color:#afc5dc; }
@media (max-width:420px) { .garage-mission-grid { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) { .garage-mission-card, .garage-mission-card * { animation:none!important; transition:none!important; } }
</style>
