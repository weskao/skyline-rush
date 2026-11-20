<script setup lang="ts">
import CollectibleIcon from './CollectibleIcon.vue';
import { inject, computed, nextTick, ref, shallowRef, useId, watch } from 'vue';
import GaragePlaytestEquip from '#garage-playtest-equip';
import GarageArtworkImage from './GarageArtworkImage.vue';
import GarageDriftPreview from './GarageDriftPreview.vue';
import GarageSkinCardFace from './GarageSkinCardFace.vue';
import { currencyIcon, skinCategoryIcon } from './collectible-icons.ts';
import Wave3CurrencyAmount from './Wave3CurrencyAmount.vue';
import Wave3DemoShortfall from './Wave3DemoShortfall.vue';
import StoreActionButton from './StoreActionButton.vue';
import { SKIN_CATEGORIES, skinArtwork } from './garage-skin-catalog.ts';
import type { SkinId } from './garage-skin-catalog.ts';
import { DEMO_QUOTE_LIFETIME_MS, sameDemoScope } from './wave3-experience-contract.ts';
import type { DemoCurrency, DemoRedemptionQuote, ExperienceResult, ExperienceSnapshot, Wave3ExperiencePort, Wave3Status } from './wave3-experience-contract.ts';
import {
  WAVE3_DEMO_ITEMS, WAVE3_DEMO_STORE_ART, demoItemStatus, demoItemStatusText,
  demoRedemptionState,
} from './wave3-demo-catalog.ts';
import type { DemoTrialAccess, DemoRedeemState, Wave3DemoItem } from './wave3-demo-catalog.ts';
import { demoBalance } from './wave3-demo-settlement.ts';
import { demoCurrencyLabel, demoPersistenceLabel } from './wave3-currency-view.ts';
import { garageStudioView } from './garage-view-state.ts';

import { presentAcquisition } from './acquisition-reveal.ts';
import { storeAcquisitionBatch } from './acquisition-demo-store.ts';

const cue = inject<(name: string) => void>('game-audio-cue', () => {});
const props = withDefaults(defineProps<{
  port: Wave3ExperiencePort;
  locale?: string;
  trialAccess?: (id: SkinId) => DemoTrialAccess | null;
  skinRevision?: number;
  active?: boolean;
  embedded?: boolean;
}>(), { locale: 'en', active: true });
const emit = defineEmits<{
  (event: 'preview', itemId: SkinId): void;
  (event: 'open-collection', itemId?: SkinId): void;
}>();
const tr = (en: string, zh: string) => props.locale === 'zh-TW' ? zh : en;
const currencyLabel = (currency: DemoCurrency) => demoCurrencyLabel(currency, props.locale);
const snapshot = ref<ExperienceSnapshot>(props.port.getSnapshot());
const categories = ['all', ...SKIN_CATEGORIES] as const;
type StoreCategory = (typeof categories)[number];
const filter = ref<StoreCategory>('all');
const selectedId = ref<SkinId>(WAVE3_DEMO_ITEMS[0]!.id);
const confirmationId = ref<SkinId | null>(null);
const quote = shallowRef<DemoRedemptionQuote | null>(null);
const store = ref<HTMLElement | null>(null);
const submitting = ref(false);
const retry = ref(false);
const confirmationButton = ref<InstanceType<typeof StoreActionButton> | null>(null);
const actionId = useId();
const statusMessage = ref<HTMLElement | null>(null);
const previewingDrift = ref(false);
const message = ref('');
let redemptionTrigger: HTMLElement | null = null;

watch(() => props.port, (port, _, onCleanup) => {
  snapshot.value = port.getSnapshot();
  cancelRedemption();
  message.value = '';
  const stop = port.subscribe(next => {
    const changedAccount = next.accountId !== snapshot.value.accountId;
    snapshot.value = next;
    const request = quote.value;
    if (changedAccount || (request && !sameDemoScope(request.scope, port.getOperationScope()))) {
      cancelRedemption();
      message.value = '';
      return;
    }
    const id = confirmationId.value;
    if (request && id && !submitting.value) {
      const state = demoRedemptionState(id, next);
      if (state === 'ready') return;
      cancelRedemption();
      message.value = feedback(state);
      void nextTick(() => {
        if (!quote.value && port === props.port && sameDemoScope(request.scope, port.getOperationScope())) {
          focusOffer(id);
        }
      });
    }
  });
  onCleanup(stop);
}, { immediate: true });
watch(() => props.active, active => {
  if (!active) previewingDrift.value = false;
});

const items = computed(() => WAVE3_DEMO_ITEMS.filter(item => filter.value === 'all' || item.category === filter.value));
const selected = computed(() => WAVE3_DEMO_ITEMS.find(item => item.id === selectedId.value));
const redeemStates = computed(() => new Map(WAVE3_DEMO_ITEMS.map(({ id }) => [id, demoRedemptionState(id, snapshot.value)])));
const redemptionState = (id: SkinId) => redeemStates.value.get(id) ?? 'invalid';
const redeemState = computed(() => selected.value ? redemptionState(selected.value.id) : 'invalid');
const hasActionReason = (state: DemoRedeemState) => state === 'unavailable' || state.startsWith('insufficient-demo-');
const secondaryWallet = computed(() => (['coins', 'diamonds'] as const).map(currency => ({
  currency, value: demoBalance(snapshot.value, currency), label: currencyLabel(currency),
})));
const selectedBalance = computed(() => selected.value?.currency ? demoBalance(snapshot.value, selected.value.currency) : null);
const statusFor = (id: SkinId) => {
  void props.skinRevision; // Re-render when the integration owner's trial session changes.
  return demoItemStatus(id, snapshot.value, props.trialAccess?.(id));
};
const driftPoster = computed(() => selected.value && previewingDrift.value
  ? skinArtwork(selected.value.id, import.meta.env.BASE_URL)?.src ?? '' : '');
const storeArt = (id: string) =>
  `${import.meta.env.BASE_URL}feature-assets/garage-store-readiness/raster/${id}@3x.webp`;
const categoryLabel = (value: StoreCategory): string => ({
  all: tr('All', '全部'), thruster: tr('Thrusters', '推進器'),
  airflow: tr('Airflow', '氣流'), 'nitro-trail': tr('NITRO trails', '氮氣尾跡'),
  'launch-flare': tr('Launch flares', '起跑閃焰'), 'drift-trail': tr('Drift trails', '甩尾痕跡'),
})[value];

function selectCategory(category: StoreCategory): void {
  filter.value = category;
  const first = items.value[0];
  if (first) selectItem(first.id);
}
function selectItem(id: SkinId): void {
  if (selectedId.value !== id) {
    selectedId.value = id;
    previewingDrift.value = false;
    message.value = '';
  }
  cancelRedemption();
}
function shortfall(item: Wave3DemoItem): number {
  return item.currency && item.demoPrice !== null
    ? Math.max(0, item.demoPrice - demoBalance(snapshot.value, item.currency)) : 0;
}
function inspectPreview(item: Wave3DemoItem): void {
  emit('preview', item.id);
  previewingDrift.value = item.category === 'drift-trail';
}
function feedback(status: DemoRedeemState | Wave3Status): string {
  switch (status) {
    case 'completed': return tr('Added to Demo Collection.', '已加入試玩收藏。');
    case 'insufficient-demo-points': return tr('Not enough demo points. Finish a race or claim a demo mission.', '試玩點數不足，請完成比賽或領取試玩任務。');
    case 'insufficient-demo-coins': return tr('Not enough demo coins. Finish races or claim the daily race mission.', '試玩金幣不足，請完成競速或領取每日競速任務。');
    case 'insufficient-demo-diamonds': return tr('Not enough demo diamonds. Claim the weekly race mission.', '試玩鑽石不足，請領取每週競速任務。');
    case 'duplicate': return tr('Already demo unlocked. Your balances are unchanged.', '已試玩取得，餘額未變更。');
    case 'expired': return tr('Confirmation expired. Review the updated price.', '確認已過期，請查看更新後的售價。');
    case 'preview-only': return tr('This item can only be previewed.', '此項目僅供預覽。');
    default: return tr('Demo redemption is unavailable.', '目前無法進行試玩兌換。');
  }
}
function reviewPrice(item: Wave3DemoItem): boolean {
  if (!item.currency || item.demoPrice === null) return false;
  const current = props.port.getSnapshot();
  snapshot.value = current;
  const state = demoRedemptionState(item.id, current);
  if (state !== 'ready') {
    cancelRedemption();
    message.value = feedback(state);
    cue('action-unavailable');
    return false;
  }
  confirmationId.value = item.id;
  quote.value = { scope: props.port.getOperationScope(), expiresAt: Date.now() + DEMO_QUOTE_LIFETIME_MS,
    catalogVersion: current.catalogVersion, currency: item.currency, cost: item.demoPrice };
  return true;
}
function requestRedemption(item: Wave3DemoItem, event: MouseEvent): void {
  if (submitting.value) return;
  selectItem(item.id);
  if (!reviewPrice(item)) {
    if ((event.currentTarget as HTMLElement | null)?.closest('.demo-detail')) {
      void nextTick(() => statusMessage.value?.scrollIntoView({ block: 'nearest' }));
    }
    return;
  }
  redemptionTrigger = event.currentTarget as HTMLElement | null;
  message.value = '';
  cue('redeem-review');
  void nextTick(() => confirmationButton.value?.focus());
}
function cancelRedemption(): void {
  confirmationId.value = null;
  quote.value = null;
  submitting.value = false;
  retry.value = false;
  redemptionTrigger = null;
}
function dismissRedemption(): void {
  if (!confirmationId.value || submitting.value) return;
  const trigger = redemptionTrigger;
  cancelRedemption();
  cue('redeem-cancelled');
  void nextTick(() => trigger?.focus());
}
function focusOffer(id: SkinId): void {
  if (!props.active) return;
  const card = store.value?.querySelector(`[data-demo-offer="${id}"]`);
  const action = card?.querySelector<HTMLButtonElement>('.demo-item-collection:enabled, .demo-item-redeem:enabled')
    ?? card?.querySelector<HTMLButtonElement>('.demo-item-preview:enabled');
  action?.scrollIntoView({ block: 'nearest' });
  action?.focus({ preventScroll: true });
}
async function confirmRedemption(): Promise<void> {
  const id = confirmationId.value;
  const item = selected.value;
  if (!id || !item || submitting.value) return;
  if (retry.value && !reviewPrice(item)) return;
  const request = quote.value;
  if (!request) return;
  const port = props.port;
  submitting.value = true;
  message.value = '';
  let result: ExperienceResult | null;
  try {
    result = await port.redeemPreview(id, request);
  } catch {
    result = null;
  }
  if (quote.value !== request || port !== props.port) return;
  if (!sameDemoScope(request.scope, port.getOperationScope())) {
    cancelRedemption();
    return;
  }
  submitting.value = false;
  if (!result || result.status === 'unavailable') {
    message.value = feedback('unavailable');
    retry.value = true;
    cue('action-unavailable');
    await nextTick();
    confirmationButton.value?.focus({ preventScroll: true });
    return;
  }
  snapshot.value = result.snapshot;
  if (result.status === 'expired') {
    if (!reviewPrice(item)) return;
    message.value = feedback('expired');
    retry.value = false;
    cue('action-unavailable');
    await nextTick();
    confirmationButton.value?.focus({ preventScroll: true });
    return;
  }
  cancelRedemption();
  const used = { points: result.deltaDemoPoints, coins: result.deltaDemoCoins, diamonds: result.deltaDemoDiamonds }[request.currency];
  message.value = result.status === 'completed' && used
    ? `${feedback(result.status)} −${Math.abs(used).toLocaleString(props.locale)} ${currencyLabel(request.currency)}`
    : feedback(result.status);
  const batch = storeAcquisitionBatch(id, request.scope, result, port);
  if (result.status !== 'completed') cue('action-unavailable');
  await nextTick();
  if (quote.value || !props.active || !store.value || port !== props.port ||
      !sameDemoScope(request.scope, port.getOperationScope())) return;
  focusOffer(id);
  if (batch) presentAcquisition(batch);
}
</script>

<template>
  <section ref="store" class="wave3-demo-store" data-wave3-demo-store data-authority="local-demo"
    :aria-label="tr('Demo Store', '試玩商城')" @keydown.esc.stop="dismissRedemption">
    <header class="demo-header">
      <div class="demo-title">
        <span class="demo-kicker">{{ tr('DEMO · NO PAYMENT', '試玩 · 無付款') }}</span>
        <h3>{{ tr('Demo Store', '試玩商城') }}</h3>
        <p>{{ tr('Earn demo rewards and redeem temporary cosmetic previews.',
          '取得可重設的試玩獎勵，兌換暫時外觀。') }}</p>
      </div>
      <slot name="navigation" />
      <div class="demo-wallet-grid" role="status" aria-live="polite">
        <div class="demo-wallet demo-wallet-cell" data-demo-balance="points">
          <CollectibleIcon :name="currencyIcon.points" />
          <span><strong>{{ snapshot.demoPoints.toLocaleString(locale) }}</strong> {{ currencyLabel('points') }}</span>
        </div>
        <div v-for="row in secondaryWallet" :key="row.currency" class="demo-wallet-cell" :data-demo-balance="row.currency">
          <CollectibleIcon :name="currencyIcon[row.currency]" />
          <span><strong>{{ row.value.toLocaleString(locale) }}</strong> {{ row.label }}</span>
        </div>
      </div>
    </header>

    <div class="demo-showroom">
      <nav class="demo-filters" :aria-label="tr('Filter cosmetic categories', '篩選外觀類別')">
        <button v-for="category in categories" :key="category" type="button"
          :aria-pressed="filter === category" :disabled="submitting" @click="selectCategory(category)">
          <CollectibleIcon :name="skinCategoryIcon[category]" />{{ categoryLabel(category) }}
        </button>
      </nav>
      <div class="demo-checkout">
        <span class="demo-sr-only" role="status">{{ submitting ? tr('Redeeming…', '兌換中…') : '' }}</span>
        <section v-if="selected" class="demo-detail" :aria-label="tr('Cosmetic preview', '外觀預覽')">
          <div v-if="!driftPoster" class="demo-detail-art" aria-hidden="true">
            <GarageSkinCardFace :skin-id="selected.id" :locale="locale" :size="156" />
          </div>
          <div class="demo-detail-copy">
            <h4>{{ selected.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }}</h4>
            <p>
              {{ demoItemStatusText(statusFor(selected.id), locale) }}
              <Wave3CurrencyAmount v-if="selected.currency && selected.demoPrice !== null && !snapshot.demoInventory.includes(selected.id)"
                class="demo-price" :currency="selected.currency" :amount="selected.demoPrice" :locale="locale" />
            </p>
            <p v-if="selected.currency && selected.currency !== 'points'" class="demo-selected-balance" role="status">
              {{ tr('Available', '可用') }}
              <Wave3CurrencyAmount :currency="selected.currency" :amount="selectedBalance ?? 0" :locale="locale" />
            </p>
          </div>
          <div v-if="hasActionReason(redeemState)" :id="actionId + '-detail'" class="demo-action-reason">
            <p v-if="redeemState === 'unavailable'" class="demo-message">{{ feedback(redeemState) }}</p>
            <Wave3DemoShortfall v-else-if="selected.currency" :currency="selected.currency" :amount="shortfall(selected)" :locale="locale" />
          </div>
          <div class="demo-actions">
            <component v-if="GaragePlaytestEquip" :is="GaragePlaytestEquip" :id="selected.id" :locale="locale" />
            <StoreActionButton v-else kind="redeem" :locale="locale" class="demo-primary"
              :pending="submitting" :disabled="submitting || redeemState !== 'ready'"
              :aria-describedby="hasActionReason(redeemState) ? actionId + '-detail' : undefined"
              @click="requestRedemption(selected, $event)">{{ tr('Demo redeem', '兌換') }}</StoreActionButton>
            <button type="button" :disabled="submitting" @click="inspectPreview(selected)"><CollectibleIcon name="inspect" />{{ tr('Inspect preview', '檢視預覽') }}</button>
            <button type="button" :disabled="submitting" @click="emit('open-collection')"><CollectibleIcon name="collection" />{{ tr('Demo Collection', '試玩收藏') }}</button>
          </div>
          <GarageDriftPreview v-if="active && driftPoster" :key="garageStudioView.car" :skin="selected.id"
            :locale="locale" :label="selected.name[locale === 'zh-TW' ? 'zh-TW' : 'en']" :poster="driftPoster" />
        </section>

        <section v-if="confirmationId && quote" class="demo-confirm" role="group"
          :aria-label="tr('Confirm demo redemption', '確認試玩兌換')" :aria-busy="submitting">
          <p v-if="selected">
            {{ selected.name[locale === 'zh-TW' ? 'zh-TW' : 'en'] }} ·
            <Wave3CurrencyAmount class="demo-price" :currency="quote.currency" :amount="quote.cost" :locale="locale" />
          </p>
          <p>{{ tr('Available', '可用') }}
            <Wave3CurrencyAmount :currency="quote.currency" :amount="demoBalance(snapshot, quote.currency)" :locale="locale" />
            · {{ tr('Remaining', '兌換後') }}
            <Wave3CurrencyAmount :currency="quote.currency" :amount="Math.max(0, demoBalance(snapshot, quote.currency) - quote.cost)" :locale="locale" />
          </p>
          <div class="demo-actions">
            <StoreActionButton ref="confirmationButton" kind="redeem" :locale="locale" class="demo-primary"
              :pending="submitting" :disabled="submitting" @click="confirmRedemption">
              {{ retry ? tr('Retry redemption', '重試兌換') : tr('Confirm demo redeem', '確認兌換') }}
            </StoreActionButton>
            <button type="button" :disabled="submitting" @click="dismissRedemption"><CollectibleIcon name="close" />{{ tr('Cancel', '取消') }}</button>
          </div>
          <p v-if="submitting" class="demo-message">{{ tr('Redeeming…', '兌換中…') }}</p>
          <p v-else-if="message" class="demo-message" role="status">{{ message }}</p>
        </section>
        <p v-if="snapshot.persistence === 'memory-only'" class="demo-message" role="status">
          {{ tr('This device could not save this session’s progress.', '此裝置未能儲存本次進度。') }}
        </p>
        <p v-if="!confirmationId" ref="statusMessage" class="demo-message" role="status" aria-live="polite">{{ message }}</p>
      </div>
      <div class="demo-catalog">
        <div v-for="item in items" :key="item.id" class="demo-item" :data-demo-offer="item.id">
          <button type="button" class="demo-item-preview" :data-demo-id="item.id" :data-demo-status="statusFor(item.id)"
            :aria-pressed="selectedId === item.id" :disabled="submitting" @click="selectItem(item.id)">
            <GarageSkinCardFace :skin-id="item.id" :locale="locale" />
            <span class="demo-state">{{ demoItemStatusText(statusFor(item.id), locale) }}</span>
            <small v-if="item.currency && item.demoPrice !== null && !snapshot.demoInventory.includes(item.id)">
              <Wave3CurrencyAmount class="demo-price" :currency="item.currency" :amount="item.demoPrice" :locale="locale" />
            </small>
          </button>
          <template v-if="item.currency && item.demoPrice !== null && !snapshot.demoInventory.includes(item.id)">
            <div v-if="hasActionReason(redemptionState(item.id))" :id="actionId + '-' + item.id">
              <p v-if="redemptionState(item.id) === 'unavailable'" class="demo-message">{{ feedback('unavailable') }}</p>
              <Wave3DemoShortfall v-else :currency="item.currency" :amount="shortfall(item)" :locale="locale" />
            </div>
            <StoreActionButton kind="redeem" :locale="locale" class="demo-item-redeem" :item="item.name[locale === 'zh-TW' ? 'zh-TW' : 'en']"
              :pending="submitting" :disabled="submitting || redemptionState(item.id) !== 'ready'"
              :aria-describedby="hasActionReason(redemptionState(item.id)) ? actionId + '-' + item.id : undefined"
              @click="requestRedemption(item, $event)" />
          </template>
          <button v-else-if="snapshot.demoInventory.includes(item.id)" type="button"
            class="demo-item-collection" :disabled="submitting" @click="emit('open-collection', item.id)">
            <CollectibleIcon name="collection" />{{ tr('View in collection', '前往收藏') }}
          </button>
        </div>
      </div>
    </div>

    <p class="demo-disclaimer">{{ demoPersistenceLabel(snapshot.persistence, locale) }} · {{ tr('Resettable', '可重設') }}</p>
    <div v-if="!embedded" class="demo-concept-art" :aria-label="tr('Existing Store source illustrations', '現有商店素材圖示')">
      <div v-for="icon in WAVE3_DEMO_STORE_ART" :key="icon" class="demo-concept-icon"
        :title="tr('Store concept art only', '僅供商店素材展示')">
        <GarageArtworkImage :src="storeArt(icon)"
          :size="72" :alt="tr('Store concept illustration', '商店概念圖示')"
          :fallback-text="tr('Store art', '商店圖示')" />
      </div>
    </div>
  </section>
</template>

<style scoped src="./wave3-demo-store.css"></style>
