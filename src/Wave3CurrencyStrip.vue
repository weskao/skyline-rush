<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch } from 'vue';
import Wave3DemoArt from './Wave3DemoArt.vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import type { ExperienceSnapshot, Wave3ExperiencePort } from './wave3-experience-contract.ts';
import { projectWave3Currency, type Wave3CurrencyRow } from './wave3-currency-view.ts';

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
const wallet = ref<HTMLElement | null>(null);
const card = ref<HTMLElement | null>(null);
const activeId = ref<Wave3CurrencyRow['id'] | null>(null);
const activeRow = computed(() => rows.value.find(row => row.id === activeId.value));
const cardId = useId();
const cardStyle = ref<Record<string, string>>({});
let pinned = false;

function closeCard(): void {
  activeId.value = null;
  pinned = false;
}

function showCard(id: Wave3CurrencyRow['id'], pin = false): void {
  const bounds = wallet.value?.getBoundingClientRect();
  if (!bounds) return;

  // Place the card in viewport coordinates, outside the scrollable Home panel.
  const inset = 12;
  const width = Math.min(260, document.documentElement.clientWidth - inset * 2);
  const below = window.innerHeight - bounds.bottom - inset;
  const above = bounds.top - inset;
  const openAbove = below < 144 && above > below;
  cardStyle.value = {
    width: width + 'px',
    left: Math.max(inset, Math.min(bounds.right - width, document.documentElement.clientWidth - width - inset)) + 'px',
    maxHeight: (openAbove ? above : below) + 'px',
    ...(openAbove ? { bottom: (window.innerHeight - bounds.top) + 'px' } : { top: bounds.bottom + 'px' }),
  };
  activeId.value = id;
  pinned = pin;
}

function hoverRow(event: PointerEvent, id: Wave3CurrencyRow['id']): void {
  if (event.pointerType === 'mouse' && !pinned) showCard(id);
}

function focusRow(event: FocusEvent, id: Wave3CurrencyRow['id']): void {
  if ((event.currentTarget as HTMLElement).matches(':focus-visible')) showCard(id);
}

function toggleRow(id: Wave3CurrencyRow['id']): void {
  if (activeId.value === id && pinned) closeCard();
  else showCard(id, true);
}

function inWallet(target: EventTarget | null): boolean {
  return target instanceof Node && !!(wallet.value?.contains(target) || card.value?.contains(target));
}

function leaveWallet(event: PointerEvent | FocusEvent): void {
  if ((!pinned || event.type === 'focusout') && !inWallet(event.relatedTarget)) closeCard();
}

function dismissOutside(event: PointerEvent): void {
  if (activeId.value && !inWallet(event.target)) closeCard();
}

function dismissOnEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || !activeId.value) return;
  event.preventDefault();
  event.stopPropagation();
  closeCard();
}

function dismissOnScroll(event: Event): void {
  if (activeId.value && !(event.target instanceof Node && card.value?.contains(event.target))) closeCard();
}

onMounted(() => {
  document.addEventListener('pointerdown', dismissOutside);
  window.addEventListener('keydown', dismissOnEscape, true);
  window.addEventListener('scroll', dismissOnScroll, true);
  window.addEventListener('resize', closeCard);
});
onUnmounted(() => {
  document.removeEventListener('pointerdown', dismissOutside);
  window.removeEventListener('keydown', dismissOnEscape, true);
  window.removeEventListener('scroll', dismissOnScroll, true);
  window.removeEventListener('resize', closeCard);
});

const currencyArt = (kind: string) => {
  const file = kind === 'coins' ? 'wallet-coin@3x.webp' : 'wallet-diamond@3x.webp';
  return `${import.meta.env.BASE_URL}feature-assets/wave3-demo/raster/${file}`;
};
</script>

<template>
  <section ref="wallet" class="wave3-wallet-strip" data-wave3-wallet
    @pointerleave="leaveWallet" @focusout="leaveWallet"
    :data-compact="String(compact)"
    :data-wallet-authority="rows[0]?.state"
    :aria-label="label('Player resources', '玩家資源')">
    <button v-for="row in rows" :key="row.id" type="button" class="wallet-currency"
      :data-currency="row.id" :data-available="row.state === 'local-demo'"
      :aria-label="row.label + ': ' + row.display + ' · ' + row.note"
      :aria-expanded="activeId === row.id" :aria-controls="activeId === row.id ? cardId : undefined"
      @pointerenter="hoverRow($event, row.id)" @focus="focusRow($event, row.id)" @click="toggleRow(row.id)">
      <Wave3DemoArt v-if="row.id === 'demo-points'" id="demo-points" />
      <span v-else class="wallet-artwork" :data-wallet-art="row.id">
        <GarageArtworkImage :src="currencyArt(row.id)" :size="48" :alt="''" :fallback-text="row.label" loading="eager" />
        <span v-if="!compact" class="wallet-orbit" aria-hidden="true"></span>
        <span v-if="!compact" class="wallet-facet" aria-hidden="true"></span>
      </span>
      <span class="wallet-quantity">
        <span v-if="!compact" class="wallet-label">{{ row.label }}</span>
        <strong v-if="row.id === 'demo-points'" :key="balanceRevision" class="wallet-credit-value"
          role="status" aria-live="polite" aria-atomic="true">{{ row.display }}</strong>
        <strong v-else>{{ row.display }}</strong>
        <small v-if="!compact">{{ row.note }}</small>
      </span>
    </button>
    <span v-if="snapshot?.persistence === 'memory-only'" class="wallet-save-warning" role="status"
      :title="label('This device could not save this session’s progress.', '此裝置未能儲存本次進度。')"
      :aria-label="label('This device could not save this session’s progress.', '此裝置未能儲存本次進度。')">⚠</span>
    <Teleport to="body">
      <section v-if="activeRow" :id="cardId" ref="card" class="wallet-detail"
        :aria-label="activeRow.label" :data-kind="activeRow.id" :style="cardStyle"
        @pointerleave="leaveWallet">
        <header class="wallet-detail-heading">
          <h2>{{ activeRow.label }}</h2>
          <strong>{{ activeRow.display }}</strong>
        </header>
        <p class="wallet-detail-note">{{ activeRow.note }}</p>
        <p>{{ activeRow.detail }}</p>
        <p v-if="snapshot?.persistence === 'memory-only'" role="status">
          {{ label('This device could not save this session’s progress.', '此裝置未能儲存本次進度。') }}
        </p>
      </section>
    </Teleport>
  </section>
</template>

<style scoped>
.wave3-wallet-strip { display:grid; grid-template-columns:repeat(3,minmax(0,1fr));
  gap:8px; min-width:0; margin:0 0 12px; padding:5px; border-radius:15px;
  background:linear-gradient(115deg,#0b2034f5,#101d32f5); }
.wallet-currency { position:relative; cursor:pointer; font:inherit; isolation:isolate; min-width:0; min-height:98px; padding:7px 3px;
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
  background:none; border:0; border-radius:0;
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
.wave3-wallet-strip[data-compact="true"] .wallet-currency[data-currency="coins"] {
  border-color:#90754c; background:linear-gradient(125deg,#382a20,#121e31 78%);
}
.wave3-wallet-strip[data-compact="true"] .wallet-currency[data-currency="diamonds"] {
  border-color:#646eb0; background:linear-gradient(125deg,#222b54,#111e34 78%);
}
.wave3-wallet-strip .wallet-currency[aria-expanded="true"] {
  outline:1px solid #c4ddff; outline-offset:-2px;
}
.wallet-currency:focus-visible { outline:2px solid #d9edff; outline-offset:2px; }
@media (hover:hover) {
  .wallet-currency:hover { filter:brightness(1.18); }
}
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

.wallet-detail {
  --wallet-accent:#8df1e9;
  position:fixed; z-index:16; box-sizing:border-box; overflow:auto; overscroll-behavior:contain;
  padding:12px 14px; border:1px solid #425d7c; border-top:2px solid var(--wallet-accent);
  border-radius:12px; background:linear-gradient(145deg,#192e48,#0e1a2c 75%);
  color:#d5e3f4; box-shadow:0 12px 30px #0009; font:500 13px/1.45 system-ui,sans-serif;
}
.wallet-detail[data-kind="coins"] { --wallet-accent:#f6cc83; }
.wallet-detail[data-kind="diamonds"] { --wallet-accent:#b9baff; }
.wallet-detail-heading {
  display:flex; justify-content:space-between; align-items:baseline; gap:10px;
  padding-bottom:6px; margin-bottom:8px; border-bottom:1px solid #38516d;
}
.wallet-detail-heading h2 { margin:0; color:#f4f8ff; font:750 15px/1.3 system-ui,sans-serif; }
.wallet-detail-heading strong { color:var(--wallet-accent); font-size:17px; font-variant-numeric:tabular-nums; }
.wallet-detail p { margin:0; }
.wallet-detail p.wallet-detail-note { margin-bottom:4px; color:var(--wallet-accent); font-size:12px; font-weight:700; }
</style>
