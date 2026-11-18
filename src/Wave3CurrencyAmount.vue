<script setup lang="ts">
import { wave3CurrencyArtUrl } from './wave3-demo-art.ts';
import { demoCurrencyLabel } from './wave3-currency-view.ts';
import type { DemoCurrency } from './wave3-experience-contract.ts';

defineProps<{ currency: DemoCurrency; amount: number; locale: string }>();
</script>

<template>
  <span class="currency-amount" :title="demoCurrencyLabel(currency, locale)">
    <img :src="wave3CurrencyArtUrl(currency)" width="16" height="16" alt="" />
    <span>{{ amount.toLocaleString(locale === 'zh-TW' ? 'zh-TW' : 'en-US') }}</span>
    <span class="currency-name">{{ ' ' + demoCurrencyLabel(currency, locale) }}</span>
  </span>
</template>

<style scoped>
.currency-amount {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  vertical-align: middle;
  font-variant-numeric: tabular-nums;
}
.currency-amount img { flex: none; object-fit: contain; }
.currency-name {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
</style>
