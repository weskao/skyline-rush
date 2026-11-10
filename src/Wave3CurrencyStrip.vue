<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Wave3DemoArt from './Wave3DemoArt.vue';
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
</script>

<template>
  <section class="wave3-wallet-strip" data-wave3-wallet
    :data-wallet-authority="rows[0]?.state"
    :aria-label="label('Player resources', '玩家資源')">
    <div v-for="row in rows" :key="row.id" class="wallet-currency"
      :data-currency="row.id" :data-available="row.state === 'local-demo'">
      <Wave3DemoArt v-if="row.id === 'demo-points'" id="demo-points" />
      <span v-else-if="row.id === 'coins'" class="wallet-symbol wallet-symbol--coin" aria-hidden="true">✦</span>
      <span v-else class="wallet-symbol wallet-symbol--diamond" aria-hidden="true">◆</span>
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
.wave3-wallet-strip { display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px; min-width:0; margin:0 0 12px; }
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
.wallet-currency :deep(.artwork-img) { width:42px;height:42px;max-width:42px;max-height:42px;object-fit:contain; }
.wallet-symbol { flex:0 0 46px;width:46px;height:46px;display:grid;place-items:center;
  font-size:23px;text-shadow:0 2px 9px #0009; }
.wallet-symbol--coin { color:#fff0a5;border:3px double #ffcd72;border-radius:50%;
  background:radial-gradient(circle at 36% 25%,#ffe8a6,#b8752c 70%,#593e25);
  box-shadow:inset 0 0 0 2px #e9a848,0 0 14px #eab34955; }
.wallet-symbol--diamond { color:#e4faff; font-size:31px; text-shadow:0 0 10px #55d9ff;
  background:linear-gradient(135deg,#b8faff 6%,#44b3ed 40%,#325da6 70%,#a180e3);
  clip-path:polygon(50% 5%,84% 25%,95% 55%,50% 95%,5% 55%,16% 25%); }
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
  .wallet-currency :deep(.artwork-img) { width:34px;height:34px; }
  .wallet-symbol { flex-basis:38px;width:38px;height:38px;font-size:18px; } }
@media (prefers-reduced-motion:reduce) { .wallet-credit-value { animation:none; } }
</style>
