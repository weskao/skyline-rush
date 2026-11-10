<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import { getLocale, onLocaleChange } from './i18n.ts';
import { WAVE3_PREVIEW_CATALOG, filterWave3PreviewItems } from './garage-wave3-preview-catalog.ts';
import type { Wave3PreviewItem } from './garage-wave3-preview-catalog.ts';
import { MISSION_DEFINITIONS, missionPeriodBounds, missionStatus, trophyTier } from './wave3-demo-missions.ts';
import type { Wave3ExperiencePort, ExperienceSnapshot, MissionProgress } from './wave3-experience-contract.ts';

const props = defineProps<{ experience?: Wave3ExperiencePort | null }>();
const locale = ref(getLocale());
const snapshot = ref<ExperienceSnapshot | null>(null);
const now = ref(Date.now());
const feedback = ref('');
const catalog = WAVE3_PREVIEW_CATALOG['garage-rewards-and-missions'];
const missions = filterWave3PreviewItems('garage-rewards-and-missions', 'mission');
const trophies = filterWave3PreviewItems('garage-rewards-and-missions', 'trophy');
const title = (item: Wave3PreviewItem) => item.name[locale.value];
const label = (en: string, zh: string) => locale.value === 'zh-TW' ? zh : en;
const asset = (id: string) => import.meta.env.BASE_URL + 'feature-assets/garage-rewards-and-missions/raster/' + id + '@3x.png';
const available = computed(() => snapshot.value?.mode === 'local-demo' &&
  snapshot.value.authority === 'local' && snapshot.value.syncState === 'local-only');
const progressOf = (id: string): MissionProgress | null =>
  available.value ? snapshot.value?.missions[id] ?? null : null;
const stateOf = (id: string) => missionStatus(progressOf(id));
const progressValue = (id: string) => Math.max(0, Math.min(progressOf(id)?.progress ?? 0, progressOf(id)?.goal ?? 0));
const goalValue = (id: string) => progressOf(id)?.goal ?? MISSION_DEFINITIONS.find(d => d.id === id)?.goal ?? 1;
const statusName = (id: string) => ({
  'not-started': label('Not started', '尚未開始'),
  'in-progress': label('In progress', '進行中'),
  completed: label('Completed', '已完成'),
  claimable: label('Claimable', '可領取'),
  claimed: label('Demo claimed', '試玩已領取'),
  unavailable: label('Unavailable', '尚未開放'),
})[stateOf(id)];
const periodRows = computed(() => MISSION_DEFINITIONS.map(def => ({
  ...def, art: missions.find(item => item.id === 'mission-' + def.family)!,
})));
const utcReset = (cadence: 'daily' | 'weekly') => {
  const { dayStart, weekStart } = missionPeriodBounds(now.value);
  return new Date(cadence === 'daily' ? dayStart + 86400000 : weekStart + 7 * 86400000)
    .toISOString().replace('.000Z', ' UTC');
};
const earnedCount = computed(() => available.value ? missions.filter(m => progressOf(m.id)?.claimed).length : 0);
const earnedTier = computed(() => trophyTier(earnedCount.value));
const TROPHY_LEVELS: Readonly<Record<string, number>> =
  { 'trophy-bronze': 1, 'trophy-silver': 2, 'trophy-gold': 3, 'trophy-platinum': 4 };
function claim(id: string): void {
  if (!available.value || stateOf(id) !== 'claimable' || !props.experience) return;
  const result = props.experience.claimMission(id);
  feedback.value = result.status === 'completed'
    ? label('Demo claim recorded locally.', '已在本機記錄試玩領取。')
    : label('Demo claim unavailable or already processed.', '試玩領取尚未開放或已處理。');
}
let stopLocale: (() => void) | undefined;
let stopExperience: (() => void) | undefined;
let minuteTimer: ReturnType<typeof setInterval> | undefined;
watch(() => props.experience, port => {
  stopExperience?.();
  snapshot.value = port?.getSnapshot() ?? null;
  stopExperience = port?.subscribe(next => { snapshot.value = next; feedback.value = ''; });
  feedback.value = '';
}, { immediate: true });
onMounted(() => {
  locale.value = getLocale();
  stopLocale = onLocaleChange(next => { locale.value = next; });
  minuteTimer = setInterval(() => {
    now.value = Date.now();
    snapshot.value = props.experience?.getSnapshot() ?? null;
  }, 60000);
});
onUnmounted(() => { stopLocale?.(); stopExperience?.(); clearInterval(minuteTimer); });
</script>

<template>
  <section class="garage-mission-board" aria-labelledby="garage-missions-title"
    :data-mission-state="available ? 'local-demo' : 'unavailable'"
    :data-rewards-authority="available ? 'local-demo' : 'not-connected'">
    <div class="garage-mission-heading">
      <h3 id="garage-missions-title">{{ label('Mission center', '任務中心') }}</h3>
      <span class="garage-mission-coming">{{ available ? label('Local demo', '本機試玩') : label('Coming soon', '尚未開放') }}</span>
    </div>
    <p class="garage-mission-notice">{{ label(
      'Demo progress and trophies are local, disposable, unverified and never server-backed. Clearing this device may erase them.',
      '試玩進度與獎盃僅儲存在本機，可清除且未經伺服器驗證；清除裝置資料可能導致遺失。') }}</p>
    <div class="garage-mission-grid">
      <article v-for="item in missions" :key="item.id" class="garage-mission-card"
        :data-mission-id="item.id" :data-mission-state="stateOf(item.id)">
        <GarageArtworkImage :src="asset(item.id)" :size="catalog.cssSize" :image-id="item.id"
          :alt="title(item)" :fallback-text="title(item)" />
        <div class="garage-mission-meta">
          <h4>{{ title(item) }}</h4>
          <span class="garage-mission-status">{{ statusName(item.id) }}</span>
          <progress :value="progressValue(item.id)" :max="goalValue(item.id)"
            :aria-label="title(item) + ': ' + progressValue(item.id) + ' / ' + goalValue(item.id)" />
          <small>{{ label('Demo progress', '試玩進度') }} {{ progressValue(item.id) }} / {{ goalValue(item.id) }}</small>
          <button v-if="stateOf(item.id) === 'claimable'" class="garage-mission-claim" type="button"
            :aria-label="label('Claim demo reward', '領取試玩獎勵') + ': ' + title(item)" @click="claim(item.id)">
            {{ label('Claim demo reward', '領取試玩獎勵') }}
          </button>
        </div>
      </article>
    </div>
    <p class="garage-mission-feedback" role="status" aria-live="polite">{{ feedback }}</p>
    <div class="garage-mission-heading garage-period-heading">
      <h4>{{ label('UTC challenges', 'UTC 每日／每週挑戰') }}</h4>
      <span class="garage-mission-coming">{{ label('Device clock · unverified', '裝置時間 · 未驗證') }}</span>
    </div>
    <p class="garage-mission-notice">{{ label('Daily reset', '每日重設') }}: {{ utcReset('daily') }} ·
      {{ label('Weekly reset (Monday)', '每週重設（週一）') }}: {{ utcReset('weekly') }}</p>
    <div class="garage-period-grid">
      <article v-for="item in periodRows" :key="item.id" class="garage-period-card"
        :data-mission-id="item.id" :data-mission-state="stateOf(item.id)">
        <strong>{{ title(item.art) }} · {{ item.cadence === 'daily' ? label('Daily', '每日') : label('Weekly', '每週') }}</strong>
        <small>{{ statusName(item.id) }}</small>
        <progress :value="progressValue(item.id)" :max="goalValue(item.id)"
          :aria-label="title(item.art) + ' ' + item.cadence + ': ' + progressValue(item.id) + ' / ' + goalValue(item.id)" />
        <small>{{ progressValue(item.id) }} / {{ goalValue(item.id) }}</small>
        <button v-if="stateOf(item.id) === 'claimable'" class="garage-mission-claim" type="button"
          @click="claim(item.id)">{{ label('Claim demo reward', '領取試玩獎勵') }}</button>
      </article>
    </div>
    <div class="garage-mission-heading garage-trophy-heading">
      <h4 id="garage-trophies-title">{{ label('Demo trophy showcase', '試玩獎盃展示') }}</h4>
      <span class="garage-mission-coming">{{ label('Not official achievements', '非正式成就') }}</span>
    </div>
    <div class="garage-trophy-grid" role="list" aria-labelledby="garage-trophies-title"
      :data-demo-tier="earnedTier">
      <figure v-for="item in trophies" :key="item.id" class="garage-trophy-card"
        :data-trophy-id="item.id"
        :data-trophy-state="available && earnedCount >= (TROPHY_LEVELS[item.id] ?? 5) ? 'demo-earned' : 'display-only'"
        role="listitem">
        <GarageArtworkImage :src="asset(item.id)" :size="catalog.cssSize" :image-id="item.id"
          :alt="title(item)" :fallback-text="title(item)" />
        <figcaption><strong>{{ title(item) }}</strong>
          <small>{{ available && earnedCount >= (TROPHY_LEVELS[item.id] ?? 5)
            ? label('Demo milestone', '試玩里程碑') : label('Display only', '僅供展示') }}</small>
        </figcaption>
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
.garage-trophy-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:10px; }
.garage-trophy-card { min-width:0; margin:0; padding:10px 6px; display:flex; flex-direction:column; align-items:center; gap:8px;
  border:1px solid #536184; border-radius:12px; background:radial-gradient(circle at 50% 30%,#33476b,#121f37 74%); }
.garage-trophy-card :deep(.artwork-img) { object-fit:contain; max-width:100%; }
.garage-trophy-card figcaption { display:grid; gap:3px; min-width:0; text-align:center; overflow-wrap:anywhere; }
.garage-trophy-card strong { font-size:12px; }
.garage-trophy-card small { font-size:11px; color:#afc5dc; }
@media (max-width:420px) { .garage-mission-grid { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) { .garage-mission-card, .garage-mission-card * { animation:none!important; transition:none!important; } }

.garage-mission-card progress,.garage-period-card progress {display:block;width:100%;height:10px;accent-color:#6ce2f6}
.garage-mission-claim {min-height:44px;border:1px solid #7fe4ff;border-radius:8px;background:#155574;color:white;cursor:pointer;padding:8px}
.garage-mission-claim:focus-visible{outline:3px solid white;outline-offset:2px}
.garage-mission-feedback {font-size:12px;min-height:1em}
.garage-period-heading {margin-top:16px}
.garage-period-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,225px),1fr));gap:10px}
.garage-period-card{display:grid;gap:6px;min-width:0;border:1px solid #385375;border-radius:10px;background:#14253d;padding:10px}
.garage-period-card strong{font-size:12px;overflow-wrap:anywhere}
.garage-period-card small{color:#abbfd5;font-size:11px}
@media (max-width:420px){.garage-period-grid{grid-template-columns:1fr}}
</style>
