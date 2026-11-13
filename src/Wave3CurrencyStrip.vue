<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Wave3DemoArt from './Wave3DemoArt.vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import type { ExperienceSnapshot, Wave3ExperiencePort } from './wave3-experience-contract.ts';
import { projectWave3Currency } from './wave3-currency-view.ts';

const props = withDefaults(defineProps<{
  experience?: Wave3ExperiencePort | null;
  locale?: string;
  compact?: boolean;
}>(), { locale: 'en', compact: false });

const snapshot = ref<ExperienceSnapshot | null>(null);
const balanceRevision = ref(0);
watch(() => props.experience, (port, _previous, onCleanup) => {
  snapshot.value = port?.getSnapshot() ?? null;
  const stop = port?.subscribe(next => { snapshot.value = next; });
  onCleanup(() => stop?.());
}, { immediate: true });
watch(() => [snapshot.value?.accountId, snapshot.value?.demoPoints], (next, previous) => {
  if (previous && (next[0] !== previous[0] || next[1] !== previous[1])) balanceRevision.value++;
});
const rows = computed(() => projectWave3Currency(snapshot.value, props.locale));
const label = (en: string, zh: string) => props.locale === 'zh-TW' ? zh : en;
const currencyArt = (kind: string) => {
  const file = kind === 'coins' ? 'wallet-coin@3x.webp' : 'wallet-diamond@3x.webp';
  return `${import.meta.env.BASE_URL}feature-assets/wave3-demo/raster/${file}`;
};
</script>

<template>
  <section class="wave3-wallet-strip" data-wave3-wallet
    :data-compact="String(compact)"
    :data-wallet-authority="rows[0]?.state"
    :aria-label="label('Player resources', '玩家資源')">
    <div v-for="row in rows" :key="row.id" class="wallet-currency"
      :data-currency="row.id" :data-available="row.state === 'local-demo'"
      :title="row.label + ': ' + row.display + ' · ' + row.note"
      :aria-label="row.label + ': ' + row.display + ' · ' + row.note">
      <Wave3DemoArt v-if="row.id === 'demo-points'" id="demo-points" />
      <span v-else class="wallet-artwork" :data-wallet-art="row.id">
        <GarageArtworkImage :src="currencyArt(row.id)" :size="48" :alt="''" :fallback-text="row.label" loading="eager" />
        <span v-if="!compact" class="wallet-orbit" aria-hidden="true"></span>
        <span v-if="!compact" class="wallet-facet" aria-hidden="true"></span>
      </span>
      <div class="wallet-quantity">
        <span v-if="!compact" class="wallet-label">{{ row.label }}</span>
        <strong v-if="row.id === 'demo-points'" :key="balanceRevision" class="wallet-credit-value"
          role="status" aria-live="polite" aria-atomic="true">{{ row.display }}</strong>
        <strong v-else>{{ row.display }}</strong>
        <small v-if="!compact">{{ row.note }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wave3-wallet-strip { display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px; min-width:0; margin:0 0 12px; padding:5px; border-radius:15px;
  background:linear-gradient(115deg,#0b2034f5,#101d32f5); }
.wallet-currency { position:relative; isolation:isolate; min-width:0; min-height:98px; padding:7px 3px;
  display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; overflow:hidden; text-align:center;
  border:1px solid #3d7692; border-radius:14px; color:#f1faff;
  background:linear-gradient(125deg,#112c47 0%,#0a1b2f 65%,#182540 100%);
  box-shadow:inset 0 1px 0 #ffffff17,0 6px 16px #0004; }
.wallet-currency[data-currency="demo-points"] { border-color:#42c6d7;
  background:radial-gradient(ellipse at 5% 0%,#266a78 0%,transparent 70%),linear-gradient(135deg,#142940,#081e30); }
.wallet-currency[data-currency="demo-points"]::before { content:'';position:absolute;inset:0;
  border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 18px #64eddb19; }
.wallet-currency[data-available="false"] { opacity:.78; border-color:#4a536b; }
.wallet-currency :deep(.wave3-demo-art) { width:48px;min-width:48px;height:48px;padding:3px; }
.wallet-currency :deep(.artwork-img) { width:42px!important;height:42px!important;max-width:42px;max-height:42px;object-fit:contain; }
.wallet-artwork { position:relative; flex:0 0 48px; display:grid; place-items:center; width:48px; height:48px;
  filter:drop-shadow(0 1px 7px #8beaff29); }
.wallet-artwork :deep(.artwork-img) { display:block; width:48px; height:48px; object-fit:contain; }

.wallet-artwork :deep(.artwork-img){position:relative;z-index:2;animation:wallet-coin-float 3.5s ease-in-out infinite}
.wallet-artwork[data-wallet-art="diamonds"] :deep(.artwork-img){animation:wallet-diamond-prism 3.5s ease-in-out infinite}
.wallet-orbit{position:absolute;z-index:1;inset:7px;border-radius:50%;border:1px solid #ffd36acc;
 border-left-color:transparent;border-bottom-color:#ffd36a22;box-shadow:0 0 8px #ffd96555;
 animation:wallet-coin-orbit 3.5s linear infinite;pointer-events:none}
.wallet-artwork[data-wallet-art="diamonds"] .wallet-orbit{border-color:#70f1ffcc;border-top-color:transparent;
 box-shadow:0 0 12px #36aaff66;animation:wallet-diamond-prism 3.1s ease-in-out infinite}
.wallet-facet{position:absolute;z-index:3;width:9px;height:9px;right:3px;top:6px;
 background:#fff8dd;clip-path:polygon(50% 0,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0 50%,38% 36%);
 filter:drop-shadow(0 0 6px #ffe78b);animation:wallet-coin-spark 3.5s ease-in-out infinite;pointer-events:none}
.wallet-artwork[data-wallet-art="diamonds"] .wallet-facet{background:#f4ffff;top:3px;
 filter:drop-shadow(0 0 7px #67efff);animation:wallet-diamond-prism 2.8s ease-in-out infinite}
@keyframes wallet-coin-orbit{to{transform:rotate(360deg)}}
@keyframes wallet-coin-float{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-3px) rotate(5deg)}}
@keyframes wallet-coin-spark{0%,25%,100%{opacity:.2;transform:scale(.5)}43%,55%{opacity:1;transform:scale(1.5)}}
@keyframes wallet-diamond-prism{0%,100%{opacity:.78;transform:translateY(1px) rotate(-5deg) scale(.96)}
 50%{opacity:1;transform:translateY(-4px) rotate(7deg) scale(1.06)}}
.wallet-quantity { min-width:0;width:100%;display:flex;flex-direction:column;align-items:center;gap:2px; }
.wallet-label { font-size:10px;line-height:1.2;font-weight:800;letter-spacing:.025em;color:#bcddf0; }
.wallet-quantity strong { font:800 clamp(15px,1.5vw,21px)/1.1 system-ui,sans-serif;
  font-variant-numeric:tabular-nums;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;color:#fff1be; }
.wallet-currency[data-available="false"] strong { color:#99a8ba; }
.wallet-quantity small { font-size:10px;line-height:1.25;color:#c4d9e4; }
.wallet-credit-value { animation:wallet-credit-glow .42s ease-out; }
@keyframes wallet-credit-glow { 0%{transform:scale(1.13);filter:brightness(1.6)}
  100%{transform:scale(1);filter:brightness(1)} }
@media (max-width:380px) { .wallet-currency { min-height:90px;padding:4px 2px; }
  .wallet-currency :deep(.wave3-demo-art) { min-width:38px;width:38px;height:38px; }
  .wallet-currency :deep(.artwork-img) { width:34px!important;height:34px!important; }
  .wallet-artwork { flex-basis:38px;width:38px;height:38px; }
  .wallet-artwork :deep(.artwork-img) { width:38px!important;height:38px!important; } }
:global(body[data-vfx-enabled="false"] .wallet-orbit),:global(body[data-vfx-enabled="false"] .wallet-facet){display:none}
:global(body[data-vfx-enabled="false"] .wallet-artwork .artwork-img){animation:none}
@media (prefers-reduced-motion:reduce){.wallet-credit-value,.wallet-orbit,.wallet-facet,.wallet-artwork :deep(.artwork-img){animation:none}}

/* Comet trails inherit Demo Points cyan/violet reflections; no icon redraw. */
.wallet-artwork::before{content:'';position:absolute;inset:17px -2px 7px -2px;
 border-radius:50%;border-bottom:2px solid #ffc963ad;border-right:1px solid #e976ff7d;
 transform:rotate(-22deg);filter:drop-shadow(0 0 5px #fbb246);
 animation:wallet-charged-trail 3.5s ease-in-out infinite;pointer-events:none;z-index:1}
.wallet-artwork[data-wallet-art="diamonds"]::before{border-bottom-color:#58e7ffb8;
 border-right-color:#b976ff91;filter:drop-shadow(0 0 6px #6cceff)}
@keyframes wallet-charged-trail{0%,100%{opacity:.25;transform:rotate(-22deg) scale(.88)}
 50%{opacity:.9;transform:rotate(11deg) scale(1.08)}}
:global(body[data-vfx-enabled="false"] .wallet-artwork::before),
:global(body[data-vfx-quality="low"] .wallet-artwork::before){display:none}
@media (prefers-reduced-motion:reduce){.wallet-artwork::before{animation:none}}


/* Home-only miniature currency chips: no large cards, labels, or extra orbit effects. */
.wave3-wallet-strip[data-compact="true"] {
  display:flex; flex-wrap:nowrap; align-items:center; gap:5px;
  width:max-content; max-width:100%; margin:0 0 5px; padding:0;
  background:none; border:0; border-radius:0; pointer-events:none;
}
.wave3-wallet-strip[data-compact="true"] .wallet-currency {
  flex:0 1 auto; flex-direction:row; align-items:center; gap:4px;
  min-width:64px; max-width:110px; height:30px; min-height:30px;
  padding:2px 8px 2px 4px; border-radius:99px; text-align:left;
  box-shadow:inset 0 1px 0 #ffffff16,0 2px 7px #0003;
}
.wave3-wallet-strip[data-compact="true"] .wallet-artwork {
  width:22px; height:22px; flex:0 0 22px; filter:none;
}
.wave3-wallet-strip[data-compact="true"] :deep(.wave3-demo-art) {
  width:22px; min-width:22px; height:22px; padding:0;
}
.wave3-wallet-strip[data-compact="true"] :deep(.artwork-img) {
  width:22px!important; height:22px!important; max-width:22px; max-height:22px;
  animation:none!important; filter:none; transform:none;
}
.wave3-wallet-strip[data-compact="true"] .wallet-artwork::before { display:none; }
.wave3-wallet-strip[data-compact="true"] .wallet-quantity { width:auto; align-items:flex-start; }
.wave3-wallet-strip[data-compact="true"] .wallet-quantity strong {
  font:800 12px/1.2 'Avenir Next','Segoe UI',sans-serif;
  color:#f7faff; max-width:65px;
}
.wave3-wallet-strip[data-compact="true"] .wallet-currency[data-available="false"] {opacity:.85}
.wave3-wallet-strip[data-compact="true"] .wallet-credit-value {animation:none}
@media (max-width:370px) {
  .wave3-wallet-strip[data-compact="true"] { gap:3px; }
  .wave3-wallet-strip[data-compact="true"] .wallet-currency { min-width:59px; padding:2px 6px 2px 3px; }
}
@media (max-height: 500px) and (orientation: landscape) {
  .wave3-wallet-strip[data-compact="true"] .wallet-currency {
    height: 16px; min-height: 16px; padding-block: 0;
  }
  .wave3-wallet-strip[data-compact="true"] :is(.wallet-artwork, :deep(.wave3-demo-art)) {
    width: 14px; min-width: 14px; height: 14px; flex-basis: 14px;
  }
  .wave3-wallet-strip[data-compact="true"] :deep(.artwork-img) {
    width: 14px !important; height: 14px !important;
  }
  .wave3-wallet-strip[data-compact="true"] .wallet-quantity strong { font-size: 11px; }
}

</style>
