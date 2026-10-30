import type { ReleaseView } from './ui-state-contracts.ts';
import { reactive } from 'vue';
export const releaseView = reactive<ReleaseView>({
  tabs: [], entries: [], panelLabel: 'release-tab-0', version: '', date: '', heroSrc: '', heroVideo: null, zoom: { image: '', video: '', close: '' },
  openHidden: false, openHasUpdate: false,
});
export function updateReleaseView(fields: Partial<ReleaseView>) { Object.assign(releaseView, fields); }
