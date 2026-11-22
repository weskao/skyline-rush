<script setup lang="ts">
// The build version / What's new opener: Home footer, teleported into the startup screen while it shows.
import packageMeta from '../package.json' with { type: 'json' };
import { t } from './i18n.ts';
import { releaseView } from './release-view-state.ts';

defineProps<{ locale: string }>();
const { version } = packageMeta;
</script>

<template>
  <div class="bottomline">
    <Teleport to="#startup-release-entry" :disabled="!releaseView.openOnStartup">
      <button type="button" id="whats-new-open" class="build-version" :hidden="releaseView.openHidden" :class="{ 'has-update': releaseView.openHasUpdate }" aria-haspopup="dialog" aria-controls="whats-new-screen" :aria-label="`${t('release.open', undefined, locale)} · v${version}`" :aria-description="releaseView.openHasUpdate ? t('release.unread', undefined, locale) : undefined"><span class="build-version-number">v{{ version }}</span><span class="build-version-separator" aria-hidden="true"></span><span class="build-version-caption" data-i18n="release.open">What's new</span><svg class="build-version-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="m5.5 3.5 4.5 4.5-4.5 4.5" /></svg><span v-if="releaseView.openHasUpdate" class="release-tab-unread" aria-hidden="true">{{ t('release.unread', undefined, locale) }}</span></button>
    </Teleport>
  </div>
</template>
