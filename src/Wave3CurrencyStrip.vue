<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Wave3DemoArt from './Wave3DemoArt.vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import type { ExperienceSnapshot, Wave3ExperiencePort } from './wave3-experience-contract.ts';
import { projectWave3Currency } from './wave3-currency-view.ts';

const props = withDefaults(defineProps<{
  experience?: Wave3ExperiencePort | null;
  locale?: string;
}>(), { locale: 'en' });

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
  const file = kind === 'coins' ? 'wallet-coin@3x.png' : 'wallet-diamond@3x.png';
  return `${import.meta.env.BASE_URL}feature-assets/wave3-demo/raster/${file}`;
};
const sparkleArt = `${import.meta.env.BASE_URL}feature-assets/wave3-demo/raster/wallet-sparkle-strip.png`;
</script>

<template>
  <section class="wave3-wallet-strip" data-wave3-wallet
    :data-wallet-authority="rows[0]?.state"
    :aria-label="label('Player resources', '玩家資源')">
    <div v-for="row in rows" :key="row.id" class="wallet-currency"
      :data-currency="row.id" :data-available="row.state === 'local-demo'">
      <Wave3DemoArt v-if="row.id === 'demo-points'" id="demo-points" />
      <span v-else class="wallet-artwork" :data-wallet-art="row.id">
        <GarageArtworkImage :src="currencyArt(row.id)" :size="48" :alt="''" :fallback-text="row.label" loading="eager" />
        <span class="wallet-shimmer" aria-hidden="true" :style="{ backgroundImage: 'url(' + sparkleArt + ')' }"></span>
      </span>
      <div class="wallet-quantity">
        <span class="wallet-label">{{ row.label }}</span>
        <strong v-if="row.id === 'demo-points'" :key="balanceRevision" class="wallet-credit-value"
          role="status" aria-live="polite" aria-atomic="true">{{ row.display }}</strong>
        <strong v-else>{{ row.display }}</strong>
        <small>{{ row.note }}</small>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wave3-wallet-strip { position:sticky; top:0; z-index:2; display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
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
.wallet-shimmer { position:absolute; inset:0; pointer-events:none; background-repeat:no-repeat;
  background-size:800% 100%; background-position:0 0; animation:wallet-shimmer 1.6s steps(7,end) infinite; }
.wallet-artwork[data-wallet-art="diamonds"] .wallet-shimmer { animation-duration:2.3s; animation-delay:-.7s; }
@keyframes wallet-shimmer { from { background-position:0 0; } to { background-position:100% 0; } }
.wallet-quantity { min-width:0;width:100%;display:flex;flex-direction:column;align-items:center;gap:2px; }
.wallet-label { font-size:10px;line-height:1.2;font-weight:800;letter-spacing:.025em;color:#bcddf0; }
.wallet-quantity strong { font:800 clamp(15px,1.5vw,21px)/1.1 system-ui,sans-serif;
  font-variant-numeric:tabular-nums;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;color:#fff1be; }
.wallet-currency[data-available="false"] strong { color:#99a8ba; }
.wallet-quantity small { font-size:9px;line-height:1.25;color:#c4d9e4; }
.wallet-credit-value { animation:wallet-credit-glow .42s ease-out; }
@keyframes wallet-credit-glow { 0%{transform:scale(1.13);filter:brightness(1.6)}
  100%{transform:scale(1);filter:brightness(1)} }
@media (max-width:380px) { .wallet-currency { min-height:90px;padding:4px 2px; }
  .wallet-currency :deep(.wave3-demo-art) { min-width:38px;width:38px;height:38px; }
  .wallet-currency :deep(.artwork-img) { width:34px!important;height:34px!important; }
  .wallet-artwork { flex-basis:38px;width:38px;height:38px; }
  .wallet-artwork :deep(.artwork-img) { width:38px!important;height:38px!important; } }
@media (max-height:480px) and (orientation:landscape) { .wave3-wallet-strip { position:static; } }
:global(body[data-vfx-enabled="false"] .wallet-shimmer) { display:none; }
@media (prefers-reduced-motion:reduce) { .wallet-credit-value, .wallet-shimmer { animation:none; } }
</style>
