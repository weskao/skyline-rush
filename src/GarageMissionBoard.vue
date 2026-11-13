<script setup lang="ts">
import { inject, computed, onMounted, onUnmounted, ref, watch } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import Wave3DemoArt from './Wave3DemoArt.vue';
import { getLocale, onLocaleChange } from './i18n.ts';
import { WAVE3_PREVIEW_CATALOG, filterWave3PreviewItems } from './garage-wave3-preview-catalog.ts';
import type { Wave3PreviewItem } from './garage-wave3-preview-catalog.ts';
import { MISSION_DEFINITIONS, missionPeriodBounds, missionPeriodId, missionStatus, trophyTier } from './wave3-demo-missions.ts';
import { demoCurrencyLabel, formatDemoReward } from './wave3-currency-view.ts';
import { wave3DemoArtUrl } from './wave3-demo-art.ts';
import { demoMissionBonus } from './wave3-demo-settlement.ts';
import type { DemoCurrency, Wave3ExperiencePort, ExperienceSnapshot, MissionProgress } from './wave3-experience-contract.ts';

const cue = inject<(name: string) => void>('game-audio-cue', () => {});
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
const asset = (id: string) => import.meta.env.BASE_URL + 'feature-assets/garage-rewards-and-missions/raster/' + id + '@3x.webp';
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
async function claim(id: string): Promise<void> {
  if (!available.value || stateOf(id) !== 'claimable' || !props.experience) return;
  const port = props.experience;
  const scope = port.getOperationScope();
  const result = await port.claimMission(id, missionPeriodId(id, snapshot.value!.updatedAt), scope);
  snapshot.value = result.snapshot;
  if (result.status === 'completed' && result.deltaDemoPoints > 0) cue('reward-credited');
  feedback.value = result.status === 'completed'
    ? formatDemoReward({ points: result.deltaDemoPoints, coins: result.deltaDemoCoins,
        diamonds: result.deltaDemoDiamonds }, locale.value)
    : result.status === 'expired'
      ? label('This challenge has expired. Check the current challenges.', '此挑戰已過期，請查看目前的挑戰。')
      : label('Demo claim unavailable or already processed.', '試玩領取尚未開放或已處理。');
}
const REWARD_ART = { points: 'demo-points', coins: 'wallet-coin', diamonds: 'wallet-diamond' } as const;
/** One chip per currency a claim pays: amount, icon and the currency name for assistive tech. */
function missionReward(id: string) {
  const delta: Record<DemoCurrency, number> = { points: progressOf(id)?.rewardDemoPoints ?? 0, ...demoMissionBonus(id) };
  return (Object.keys(REWARD_ART) as DemoCurrency[]).filter(currency => delta[currency] > 0).map(currency => ({
    currency, amount: delta[currency], art: wave3DemoArtUrl(REWARD_ART[currency]),
    name: demoCurrencyLabel(currency, locale.value),
  }));
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
            <Wave3DemoArt id="demo-claim" />
            <span>{{ label('Claim demo reward', '領取試玩獎勵') }}</span>
          </button>
          <Wave3DemoArt v-else-if="stateOf(item.id) === 'claimed'" id="demo-claim"
            :alt="label('Demo claimed', '試玩已領取')" />
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
        <strong class="period-title">{{ title(item.art) }} · {{ item.cadence === 'daily' ? label('Daily', '每日') : label('Weekly', '每週') }}</strong>
        <small class="period-count">{{ progressValue(item.id) }} / {{ goalValue(item.id) }}</small>
        <progress :value="progressValue(item.id)" :max="goalValue(item.id)"
          :aria-label="title(item.art) + ' ' + (item.cadence === 'daily' ? label('Daily', '每日') : label('Weekly', '每週')) + ': ' + progressValue(item.id) + ' / ' + goalValue(item.id)" />
        <small class="period-status">{{ statusName(item.id) }}</small>
        <small v-if="available" class="period-reward">
          <span v-for="chip in missionReward(item.id)" :key="chip.currency" class="period-chip" :data-currency="chip.currency">
            +{{ chip.amount }}<GarageArtworkImage :src="chip.art" :size="16" :alt="chip.name" :fallback-text="chip.name" />
          </span>
        </small>
        <button v-if="stateOf(item.id) === 'claimable'" class="garage-mission-claim period-claim" type="button"
          @click="claim(item.id)">
          <Wave3DemoArt id="demo-claim" />
          <span>{{ label('Claim demo reward', '領取試玩獎勵') }}</span>
        </button>
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
/* Four trophies as a 2x2 block; 3px side padding keeps the 96px art whole in the 214px tablet column. */
.garage-trophy-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; margin-top:8px; }
.garage-trophy-card { min-width:0; margin:0; padding:7px 3px 8px; display:flex; flex-direction:column; align-items:center; gap:4px;
  border:1px solid #536184; border-radius:12px; background:radial-gradient(circle at 50% 30%,#33476b,#121f37 74%); }
.garage-trophy-card :deep(.artwork-img) { object-fit:contain; max-width:100%; }
.garage-trophy-card figcaption { display:grid; gap:1px; min-width:0; line-height:1.25; text-align:center; overflow-wrap:anywhere; }
.garage-trophy-card strong { font-size:12px; }
.garage-trophy-card small { font-size:11px; color:#afc5dc; }
@media (max-width:420px) { .garage-mission-grid { grid-template-columns:1fr; } }
@media (prefers-reduced-motion:reduce) { .garage-mission-card, .garage-mission-card * { animation:none!important; transition:none!important; } }

.garage-mission-card progress,.garage-period-card progress {display:block;width:100%;height:10px;accent-color:#6ce2f6}
.garage-mission-claim {display:flex;flex-direction:column;align-items:center;gap:3px;min-height:44px;border:1px solid #7fe4ff;border-radius:8px;background:#155574;color:white;cursor:pointer;padding:8px}
.garage-mission-claim:focus-visible{outline:3px solid white;outline-offset:2px}
.garage-mission-feedback {font-size:12px;min-height:1em;color:#a6f5d8;font-weight:750;font-variant-numeric:tabular-nums}
.garage-period-heading {margin-top:16px}
/* Quest card: title | count, bar | status, reward chips, claim. Two cards per row on phones.
   Each part takes its columns from its own class and its row from document order: never place a part by
   sibling position or a fixed row, or a line added later lands on another (the reward sat on the title). */
.garage-period-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,150px),1fr));gap:7px}
.garage-period-card{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;align-content:start;gap:4px 8px;min-width:0;border:1px solid #385375;border-radius:10px;background:#14253d;padding:7px 9px}
/* Three tracks so the long status only narrows the bar, and the short count only narrows the title. */
.period-title{grid-column:1/3;font-size:12px;line-height:1.3;overflow-wrap:anywhere}
.period-count,.period-status,.period-reward{color:#abbfd5;font-size:11px;font-variant-numeric:tabular-nums}
.period-count,.period-status{justify-self:end;white-space:nowrap}
.period-count{grid-column:3}
.garage-period-card progress{grid-column:1}
.period-status{grid-column:2/4}
.period-reward,.period-claim{grid-column:1/-1;min-width:0}
.period-reward{display:flex;flex-wrap:wrap;gap:2px 8px}
.period-chip{display:inline-flex;align-items:center;gap:3px}
.period-claim{flex-direction:row;justify-content:center;gap:6px;padding:4px 8px;font-size:12px;line-height:1.25;text-align:left}
.period-claim > span:last-child{min-width:0;overflow-wrap:anywhere}
/* The 72px claim art would fill a 150px card; same downsizing as the wallet strip. */
.period-claim :deep(.wave3-demo-art){width:32px;min-width:32px;height:32px;padding:0}
.period-claim :deep(.artwork-img){width:32px!important;height:32px!important}
.garage-period-card[data-mission-state="claimable"]{border-color:#7fe4ff;background:#16324c}
.garage-period-card[data-mission-state="claimable"] .period-status{color:#ffd76a}
.garage-period-card[data-mission-state="claimed"] .period-status{color:#a6f5d8}
.garage-period-card[data-mission-state="claimed"] .period-status::before{content:'✓ '}

/* Independent object-specific motion: telemetry orbit and trophy illumination. */
.garage-mission-card,.garage-trophy-card{position:relative;isolation:isolate}
.garage-mission-card::before{content:'';position:absolute;pointer-events:none;left:13px;top:50%;
 width:84px;height:84px;border:2px dashed #70f1ff77;border-radius:50%;
 transform:translateY(-50%);animation:mission-drive 8s linear infinite}
.garage-mission-card[data-mission-id="mission-drift"]::before{border-color:#ee82ff99;animation-direction:reverse}
.garage-mission-card[data-mission-id="mission-combo"]::before{border-color:#ffcb6999;animation-duration:4s}
.garage-mission-card :deep(.artwork-img){position:relative;z-index:1;animation:mission-float 3.8s ease-in-out infinite}
.garage-mission-card[data-mission-state="claimed"] :deep(.artwork-img){animation:mission-claim-burst .75s ease-out 1 both}
.garage-trophy-card::before{content:'';position:absolute;left:50%;top:40px;width:80px;height:80px;
 border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;
 background:radial-gradient(circle,#f9eeb15e,transparent 70%);animation:trophy-awaken 4.5s ease-in-out infinite}
.garage-trophy-card[data-trophy-id="trophy-platinum"]::before{background:radial-gradient(circle,#80fcff75,transparent 70%)}
.garage-trophy-card :deep(.artwork-img){position:relative;z-index:1;animation:trophy-rise 4.5s ease-in-out infinite}
@keyframes mission-drive{to{transform:translateY(-50%) rotate(360deg)}}
@keyframes mission-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes mission-claim-burst{0%{filter:brightness(1);transform:scale(.85)}
35%{filter:brightness(1.9);transform:scale(1.2)}70%{transform:scale(.96)}
100%{transform:scale(1);filter:brightness(1)}}
@keyframes trophy-awaken{0%,100%{opacity:.4;filter:brightness(1)}50%{opacity:1;filter:brightness(1.9)}}
@keyframes trophy-rise{0%,100%{transform:translateY(1px)}50%{transform:translateY(-5px)}}
:global(body[data-vfx-enabled="false"] .garage-mission-board .garage-mission-card::before),
:global(body[data-vfx-enabled="false"] .garage-mission-board .garage-trophy-card::before){display:none}
@media (prefers-reduced-motion:reduce){.garage-mission-card::before,.garage-trophy-card::before,
.garage-mission-card :deep(.artwork-img),.garage-trophy-card :deep(.artwork-img){animation:none!important}}

/* Shape-specific Wave 3 racing effects; original silhouettes are never redrawn. */
.garage-mission-card[data-mission-id="mission-race"] :deep(.artwork-img){
 animation:mission-flag-wave 3.3s ease-in-out infinite}
.garage-mission-card[data-mission-id="mission-time"] :deep(.artwork-img){
 animation:mission-time-tick 4s steps(12,end) infinite}
.garage-mission-card[data-mission-id="mission-drift"] :deep(.artwork-img){
 animation:mission-drift-pulse 3.8s cubic-bezier(.3,.1,.5,1) infinite}
.garage-mission-card[data-mission-id="mission-combo"] :deep(.artwork-img){
 animation:mission-combo-boost 2.7s ease-out infinite}
@keyframes mission-flag-wave{0%,100%{transform:skewY(0deg) translateY(0)}
 25%{transform:skewY(-2deg) translateY(-3px)}75%{transform:skewY(2deg) translateY(-1px)}}
@keyframes mission-time-tick{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
@keyframes mission-drift-pulse{0%,100%{transform:rotate(-6deg) scale(1)}
 52%{transform:rotate(6deg) scale(1.08)}}
@keyframes mission-combo-boost{0%,100%{transform:translateX(0) scale(1);filter:brightness(1)}
 45%{transform:translateX(5px) scale(1.1);filter:brightness(1.5)}}
.garage-trophy-card[data-trophy-id="trophy-bronze"] :deep(.artwork-img){animation-duration:5.1s}
.garage-trophy-card[data-trophy-id="trophy-silver"] :deep(.artwork-img){animation-duration:4.4s}
.garage-trophy-card[data-trophy-id="trophy-gold"] :deep(.artwork-img){animation-duration:3.8s}
.garage-trophy-card[data-trophy-id="trophy-platinum"] :deep(.artwork-img){animation-duration:3.1s}
:global(body[data-vfx-enabled="false"] .garage-mission-board .garage-mission-card .artwork-img),
:global(body[data-vfx-enabled="false"] .garage-mission-board .garage-trophy-card .artwork-img){animation:none!important}

</style>
