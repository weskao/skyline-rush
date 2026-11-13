<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import GarageArtworkImage from './GarageArtworkImage.vue';
import Wave3DemoArt from './Wave3DemoArt.vue';
import { SKIN_CATEGORIES, skinArtwork } from './garage-skin-catalog.ts';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { DEMO_QUOTE_LIFETIME_MS } from './wave3-experience-contract.ts';
import type { DemoCurrency, DemoRedemptionQuote, ExperienceSnapshot, Wave3ExperiencePort, Wave3Status } from './wave3-experience-contract.ts';
import {
  WAVE3_DEMO_ITEMS, WAVE3_DEMO_STORE_ART, demoItemStatus, demoItemStatusText,
  demoRedemptionState,
} from './wave3-demo-catalog.ts';
import type { DemoTrialAccess, DemoRedeemState, Wave3DemoItem } from './wave3-demo-catalog.ts';
import { demoBalance } from './wave3-demo-settlement.ts';
import { demoCurrencyLabel } from './wave3-currency-view.ts';

const props = withDefaults(defineProps<{
  port: Wave3ExperiencePort;
  locale?: string;
  trialAccess?: (id: SkinId) => DemoTrialAccess | null;
  skinRevision?: number;
}>(), { locale: 'en' });
const emit = defineEmits<{
  (event: 'preview', itemId: SkinId): void;
  (event: 'open-collection'): void;
}>();
const tr = (en: string, zh: string) => props.locale === 'zh-TW' ? zh : en;
const currencyLabel = (currency: DemoCurrency) => demoCurrencyLabel(currency, props.locale);
const priceText = (item: Wave3DemoItem) => item.currency && item.demoPrice !== null
  ? `${item.demoPrice.toLocaleString(props.locale === 'zh-TW' ? 'zh-TW' : 'en-US')} ${currencyLabel(item.currency)}`
  : tr('Preview only', '僅供預覽');
const snapshot = ref<ExperienceSnapshot>(props.port.getSnapshot());
const filter = ref<'all' | SkinCategory>('all');
const categories = ['all', ...SKIN_CATEGORIES] as const;
const selectedId = ref<SkinId>(WAVE3_DEMO_ITEMS[0]!.id);
const confirmationId = ref<SkinId | null>(null);
const quote = ref<DemoRedemptionQuote | null>(null);
const confirmationButton = ref<HTMLButtonElement | null>(null);
const message = ref('');

watch(() => props.port, (port, _, onCleanup) => {
  snapshot.value = port.getSnapshot();
  confirmationId.value = null;
  message.value = '';
  const stop = port.subscribe(next => {
    if (next.accountId !== snapshot.value.accountId) {
      confirmationId.value = null;
      quote.value = null;
      message.value = '';
    }
    snapshot.value = next;
  });
  onCleanup(stop);
}, { immediate: true });

const items = computed(() => WAVE3_DEMO_ITEMS.filter(item => filter.value === 'all' || item.category === filter.value));
const selected = computed(() => WAVE3_DEMO_ITEMS.find(item => item.id === selectedId.value));
const redeemState = computed(() => selected.value
  ? demoRedemptionState(selected.value.id, snapshot.value) : 'invalid');
const secondaryWallet = computed(() => (['coins', 'diamonds'] as const).map(currency => ({
  currency, value: demoBalance(snapshot.value, currency), label: currencyLabel(currency),
})));
const canRequestRedemption = computed(() => redeemState.value === 'ready' || redeemState.value.startsWith('insufficient-demo-'));
const selectedBalance = computed(() => selected.value?.currency ? demoBalance(snapshot.value, selected.value.currency) : null);
const statusFor = (id: SkinId) => {
  void props.skinRevision; // Re-render when the integration owner's trial session changes.
  return demoItemStatus(id, snapshot.value, props.trialAccess?.(id));
};
const artwork = (id: SkinId) => skinArtwork(id, import.meta.env.BASE_URL);
const storeArt = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/garage-store-readiness/raster/${id}@3x.webp`;
const categoryLabel = (value: 'all' | SkinCategory): string => ({
  all: tr('All', '全部'), thruster: tr('Thrusters', '推進器'),
  airflow: tr('Airflow', '氣流'), 'nitro-trail': tr('NITRO trails', '氮氣尾跡'),
  'launch-flare': tr('Launch flares', '起跑閃焰'),
})[value];

function selectCategory(category: 'all' | SkinCategory): void {
  filter.value = category;
  const first = items.value[0];
  if (first) selectedId.value = first.id;
  confirmationId.value = null;
}
function feedback(status: DemoRedeemState | Wave3Status): string {
  switch (status) {
    case 'completed': return tr('Demo unlocked. Open Demo Collection to equip.', '試玩取得成功，請前往試玩收藏裝備。');
    case 'insufficient-demo-points': return tr('Not enough demo points. Finish a race or claim a demo mission.', '試玩點數不足，請完成比賽或領取試玩任務。');
    case 'insufficient-demo-coins': return tr('Not enough demo coins. Finish races or claim the daily race mission.', '試玩金幣不足，請完成競速或領取每日競速任務。');
    case 'insufficient-demo-diamonds': return tr('Not enough demo diamonds. Claim the weekly race mission.', '試玩鑽石不足，請領取每週競速任務。');
    case 'duplicate': return tr('Already demo unlocked. Your balances are unchanged.', '已試玩取得，餘額未變更。');
    case 'expired': return tr('Confirmation expired. Review the current price and try again.', '確認已過期，請查看目前售價後重新兌換。');
    case 'unavailable': return tr('Only local demo redemption is available.', '僅支援本機試玩兌換。');
    case 'preview-only': return tr('This item can only be previewed.', '此項目僅供預覽。');
    default: return tr('Demo redemption is unavailable.', '目前無法進行試玩兌換。');
  }
}
function requestRedemption(): void {
  const item = selected.value;
  if (!item?.currency || item.demoPrice === null) return;
  const current = props.port.getSnapshot();
  const state = demoRedemptionState(item.id, current);
  if (state !== 'ready') { message.value = feedback(state); return; }
  snapshot.value = current;
  confirmationId.value = item.id;
  quote.value = { scope: props.port.getOperationScope(), expiresAt: Date.now() + DEMO_QUOTE_LIFETIME_MS,
    catalogVersion: current.catalogVersion, currency: item.currency, cost: item.demoPrice };
  message.value = '';
  void nextTick(() => confirmationButton.value?.focus());
}
function cancelRedemption(): void {
  confirmationId.value = null;
  quote.value = null;
}
async function confirmRedemption(): Promise<void> {
  const id = confirmationId.value;
  const request = quote.value;
  if (!id || !request) return;
  cancelRedemption();
  const result = await props.port.redeemPreview(id, request);
  snapshot.value = result.snapshot;
  message.value = feedback(result.status);
}
</script>

<template>
  <section class="wave3-demo-store" data-wave3-demo-store data-authority="local-demo"
    :aria-label="tr('Demo Store', '試玩商城')" @keydown.esc.stop="cancelRedemption">
    <header class="demo-header">
      <div class="demo-title">
        <span class="demo-kicker">{{ tr('LOCAL · NO PAYMENT', '本機試玩 · 無付款') }}</span>
        <h3>{{ tr('Demo Store', '試玩商城') }}</h3>
        <p>{{ tr('Earn local demo rewards and redeem temporary cosmetic previews.',
          '取得可重設的本機試玩獎勵，兌換暫時外觀。') }}</p>
      </div>
      <div class="demo-wallet" data-demo-balance="points" role="status" aria-live="polite">
        <Wave3DemoArt id="demo-points" :alt="tr('Demo points', '試玩點數')" />
        <strong>{{ snapshot.demoPoints }}</strong>
        <span>{{ tr('Demo points', '試玩點數') }}</span>
      </div>
      <div class="demo-secondary-wallet">
        <span v-for="row in secondaryWallet" :key="row.currency" :data-demo-balance="row.currency">
          {{ row.label }} <strong>{{ row.value }}</strong>
        </span>
      </div>
    </header>

    <div class="demo-concept-art" :aria-label="tr('Existing Store source illustrations', '現有商店素材圖示')">
      <div v-for="icon in WAVE3_DEMO_STORE_ART" :key="icon" class="demo-concept-icon"
        :title="tr('Store concept art only', '僅供商店素材展示')">
        <GarageArtworkImage :src="storeArt(icon)"
          :size="72" :alt="tr('Store concept illustration', '商店概念圖示')"
          :fallback-text="tr('Store art', '商店圖示')" />
      </div>
    </div>

    <nav class="demo-filters" :aria-label="tr('Filter cosmetic categories', '篩選外觀類別')">
      <button v-for="category in categories" :key="category" type="button"
        :aria-pressed="filter === category" @click="selectCategory(category)">
        {{ categoryLabel(category) }}
      </button>
    </nav>

    <div class="demo-catalog">
      <button v-for="item in items" :key="item.id" type="button"
        class="demo-item" :data-demo-id="item.id" :data-demo-status="statusFor(item.id)"
        :aria-pressed="selectedId === item.id" @click="selectedId = item.id; cancelRedemption()">
        <span class="demo-image">
          <GarageArtworkImage :src="artwork(item.id)?.src ?? ''" :fallback-src="artwork(item.id)?.fallback"
            :size="96" :alt="item.name[locale === 'zh-TW' ? 'zh-TW' : 'en']"
            :fallback-text="item.name[locale === 'zh-TW' ? 'zh-TW' : 'en']" />
        </span>
        <strong>{{ item.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</strong>
        <span class="demo-state">{{ demoItemStatusText(statusFor(item.id), locale) }}</span>
        <small v-if="item.demoPrice !== null">{{ priceText(item) }}</small>
        <small v-else>{{ tr('No demo redemption', '不開放試玩兌換') }}</small>
      </button>
    </div>

    <section v-if="selected" class="demo-detail" :aria-label="tr('Cosmetic preview', '外觀預覽')">
      <div>
        <h4>{{ selected.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
        <p>{{ demoItemStatusText(statusFor(selected.id), locale) }} ·
          {{ priceText(selected) }}
        </p>
        <p v-if="selected.currency && selected.currency !== 'points'" class="demo-selected-balance" role="status">
          {{ tr('Available', '可用') }} {{ selectedBalance }} {{ currencyLabel(selected.currency) }}
        </p>
      </div>
      <div class="demo-actions">
        <button type="button" @click="emit('preview', selected.id)">{{ tr('Inspect preview', '檢視預覽') }}</button>
        <button type="button" :disabled="!canRequestRedemption"
          @click="requestRedemption">{{ tr('Demo redeem', '試玩兌換') }}</button>
        <button type="button" @click="emit('open-collection')">{{ tr('Demo Collection', '試玩收藏') }}</button>
      </div>
    </section>

    <section v-if="confirmationId && quote" class="demo-confirm" role="group"
      :aria-label="tr('Confirm demo redemption', '確認試玩兌換')">
      <p v-if="selected">{{ selected.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }} · {{ priceText(selected) }}</p>
      <p>{{ tr('Available', '可用') }} {{ demoBalance(snapshot, quote.currency) }} ·
        {{ tr('Remaining', '兌換後') }} {{ Math.max(0, demoBalance(snapshot, quote.currency) - quote.cost) }}
        {{ currencyLabel(quote.currency) }}</p>
      <div class="demo-actions">
        <button ref="confirmationButton" type="button" @click="confirmRedemption">{{ tr('Confirm demo redeem', '確認試玩兌換') }}</button>
        <button type="button" @click="cancelRedemption">{{ tr('Cancel', '取消') }}</button>
      </div>
    </section>
    <p v-if="snapshot.persistence === 'memory-only'" class="demo-message" role="status">
      {{ tr('This device could not save this session’s progress.', '此裝置未能儲存本次進度。') }}
    </p>
    <p class="demo-message" role="status" aria-live="polite">{{ message }}</p>
    <p class="demo-disclaimer">{{ tr('This device only · Resettable · No Firebase sign-in required',
      '僅限此裝置 · 可重設 · 無須 Firebase 登入') }}</p>
  </section>
</template>

<style scoped>
.wave3-demo-store { box-sizing: border-box; min-width: 0; color: #e7f5ff; border: 1px solid #317aa7;
  border-radius: 16px; padding: 14px; background: radial-gradient(ellipse at 95% 0, #23466c 0, transparent 49%), #071b2d; }
.demo-header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; }
.demo-title { flex: 1 1 220px; min-width: 0; }
.demo-kicker { color: #6be8df; font-weight: 800; font-size: 11px; letter-spacing: .09em; }
.demo-title h3 { margin: 5px 0 8px; font-size: clamp(18px, 2vw, 24px); }
.demo-title p, .demo-disclaimer { margin: 0; font-size: 12px; line-height: 1.6; color: #bad4e9; }
.demo-wallet { position:relative; display: flex; flex-direction: column; align-items: center; min-width: 112px;
  border: 1px solid #60dcd2; border-radius: 12px; padding: 8px;
  background:radial-gradient(circle at 50% 0%,#255a6a,#0c253d 80%);
  box-shadow:inset 0 1px 0 #ffffff26,0 0 18px #3bf0d62f; }
.demo-wallet strong { font-size: 26px; font-variant-numeric: tabular-nums; }
.demo-wallet span { font-size: 12px; color: #9bf2e0; }
.demo-concept-art { display: flex; gap: 8px; overflow-x: auto; padding: 10px 0; margin: 10px 0;
  scrollbar-width: thin; }
.demo-concept-icon { box-sizing: border-box; display: grid; place-items: center; flex: 0 0 88px;
  width: 88px; height: 88px; padding: 8px; border: 1px solid #395e82; border-radius: 12px; background: #102841; }
.demo-filters, .demo-actions { display: flex; gap: 8px; flex-wrap: wrap; }
button { box-sizing: border-box; min-height: 44px; color: inherit; cursor: pointer; touch-action: manipulation; }
.demo-filters button, .demo-actions button { border: 1px solid #558ba8; border-radius: 9px; padding: 9px 12px; background: #163c5c; }
.demo-filters button[aria-pressed="true"], .demo-actions button:not(:disabled):active {
  border-color: #67e5ee; background: #215878; }
button:focus-visible { outline: 3px solid #8af4ff; outline-offset: 2px; }
button:disabled { cursor: not-allowed; opacity: .55; }
.demo-catalog { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr)); gap: 10px; margin: 12px 0; }
.demo-item { display: flex; flex-direction: column; align-items: center; min-width: 0; padding: 8px;
  gap: 6px; background: linear-gradient(150deg, #123650, #101e36); border: 1px solid #36658b;
  border-radius: 13px; text-align: center; }
.demo-item[aria-pressed="true"] { border-color: #67e9f5; box-shadow: 0 0 0 1px #69dcea; }
.demo-image { box-sizing: border-box; display: grid; place-items: center; width: 112px; height: 112px; padding: 8px; }
.demo-item strong { font-size: 12px; overflow-wrap: anywhere; }
.demo-state { padding: 3px 7px; border: 1px solid #8c71bc; border-radius: 20px; font-size: 11px; color: #f0dfff; }
.demo-item[data-demo-status="demo-unlocked"] .demo-state { border-color: #27e6bb; color: #9bffe9; }
.demo-item small { color: #aacde2; font-size: 11px; }
.demo-secondary-wallet { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; }
.demo-detail, .demo-confirm { margin-top: 10px; padding: 12px; border: 1px solid #356c8f;
  border-radius: 12px; background: #0e2942; }
.demo-detail h4 { margin: 0 0 6px; }
.demo-detail p, .demo-confirm p { margin: 0 0 10px; font-size: 12px; line-height: 1.5; }
.demo-message { min-height: 1.5em; margin: 10px 0; color: #ffe3ac; font-size: 12px; }
@media (max-width: 440px) { .wave3-demo-store { padding: 9px; } .demo-catalog { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition: none !important; animation: none !important; } }
</style>
