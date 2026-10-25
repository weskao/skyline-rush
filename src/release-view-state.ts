import type { ReleaseView } from './ui-state-contracts.js';
import { reactive } from 'vue';
export const releaseView = reactive<ReleaseView>({
  tabs: [], entries: [], panelLabel: 'release-tab-0', version: '', date: '', heroSrc: '',
});
export function updateReleaseView(fields: Partial<ReleaseView>) { Object.assign(releaseView, fields); }
